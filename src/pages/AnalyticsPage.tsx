import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useSelectedClient } from "@/hooks/useSelectedClient";
import { useAnalyticsSnapshotsByYears, useClientIntegration, useSyncPoconverto, useSyncIcount, useUpsertClientIntegration, useIntegrationSettings, useUpsertIntegrationSetting } from "@/hooks/useAnalytics";
import { useCommissionPlans, calculateCommission } from "@/hooks/useCommissionPlans";
import { useMonthlyServicesByYear } from "@/hooks/useServices";
import { useOfflineRevenueMultiYear, useUpsertOfflineRevenue } from "@/hooks/useOfflineRevenue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Settings, TrendingUp, TrendingDown, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const sourceLabels: Record<string, string> = { icount_other: "אייקאונט / אחר", phone: "טלפוני", fair: "ירידים", offline_store: "חנות פיזית", other: "אחר" };

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `₪${Number(n).toLocaleString()}`;
}

function pct(n: number | null | undefined): string {
  if (n == null || isNaN(n) || !isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function AnalyticsPage() {
  const { data: clients } = useClients();
  const { clientId, setClientId } = useSelectedClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const yearNum = parseInt(year);

  const { data: snapshots } = useAnalyticsSnapshotsByYears(clientId, [yearNum, yearNum - 1]);
  const { data: plans } = useCommissionPlans(clientId);
  const { data: services } = useMonthlyServicesByYear(clientId, yearNum);
  const { data: integration } = useClientIntegration(clientId);
  const { data: offlineRevenue } = useOfflineRevenueMultiYear(clientId, [yearNum, yearNum - 1]);
  const sync = useSyncPoconverto();
  const icountSync = useSyncIcount();
  const upsertIntegration = useUpsertClientIntegration();
  const { data: settings } = useIntegrationSettings();
  const upsertSetting = useUpsertIntegrationSetting();
  const upsertOffline = useUpsertOfflineRevenue();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drillMonth, setDrillMonth] = useState<number | null>(null);
  const [settingsForm, setSettingsForm] = useState({ base_url: "", api_key: "", client_key: "", shop_domain: "", icount_company_id: "", icount_api_token: "" });
  const [offlineDialog, setOfflineDialog] = useState(false);
  const [offlineForm, setOfflineForm] = useState({ month: (new Date().getMonth() + 1).toString(), amount_gross: "", amount_net: "", source: "icount_other", notes: "" });

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const thisYearSnapshots = snapshots?.filter((s: any) => s.year === yearNum) || [];
  const lastYearSnapshots = snapshots?.filter((s: any) => s.year === yearNum - 1) || [];
  const thisYearOffline = offlineRevenue?.filter((r: any) => r.year === yearNum) || [];

  const getSnapshot = (month: number, yr: number = yearNum) => {
    const list = yr === yearNum ? thisYearSnapshots : lastYearSnapshots;
    return list.find((s: any) => s.month === month);
  };

  const getOfflineRevenue = (month: number) =>
    thisYearOffline.filter((r: any) => r.month === month).reduce((sum: number, r: any) => sum + Number(r.amount_gross || 0), 0);

  const activePlan = plans?.find((p: any) => p.is_active);
  const tiers = activePlan?.commission_tiers?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  const getServiceFees = (month: number) =>
    services?.filter((s: any) => s.month === month).reduce((sum: number, s: any) => sum + Number(s.unit_price || s.monthly_fee) * Number(s.quantity || 1), 0) || 0;

  const getCommission = (month: number) => {
    const snap = getSnapshot(month);
    if (!snap || !activePlan) return null;
    return calculateCommission(Number(snap.net_sales), tiers, Number(activePlan.minimum_fee));
  };

  const yoyPct = (current: number | undefined, prev: number | undefined) => {
    if (!current || !prev || prev === 0) return null;
    return ((current - prev) / prev) * 100;
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentSnap = getSnapshot(currentMonth);
  const lastYearSnap = getSnapshot(currentMonth, yearNum - 1);
  const currentCommission = getCommission(currentMonth);
  const currentMER = currentSnap && Number(currentSnap.ad_spend_total) > 0
    ? Number(currentSnap.net_sales) / Number(currentSnap.ad_spend_total) : null;
  const currentOffline = getOfflineRevenue(currentMonth);

  const openSettings = () => {
    setSettingsForm({
      base_url: settings?.poconverto_base_url || "",
      api_key: settings?.poconverto_api_key || "",
      client_key: (integration as any)?.poconverto_client_key || "",
      shop_domain: (integration as any)?.shop_domain || "",
      icount_company_id: (integration as any)?.icount_company_id || "",
      icount_api_token: (integration as any)?.icount_api_token || "",
    });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    try {
      if (settingsForm.base_url) await upsertSetting.mutateAsync({ key: "poconverto_base_url", value: settingsForm.base_url });
      if (settingsForm.api_key) await upsertSetting.mutateAsync({ key: "poconverto_api_key", value: settingsForm.api_key });
      if (clientId) {
        await upsertIntegration.mutateAsync({
          client_id: clientId,
          poconverto_client_key: settingsForm.client_key || undefined,
          shop_domain: settingsForm.shop_domain || undefined,
          icount_company_id: settingsForm.icount_company_id || undefined,
          icount_api_token: settingsForm.icount_api_token || undefined,
        } as any);
      }
      toast.success("ההגדרות נשמרו");
      setSettingsOpen(false);
    } catch { toast.error("שגיאה בשמירת הגדרות"); }
  };

  const handleSync = async (months: "current" | "last24" | "last36") => {
    if (!clientId) { toast.error("בחר לקוח"); return; }
    try {
      await sync.mutateAsync({ clientId, months });
      const msg = months === "current" ? "חודש נוכחי סונכרן" : months === "last24" ? "24 חודשים סונכרנו" : "36 חודשים סונכרנו";
      toast.success(msg);
    } catch { toast.error("שגיאה בסנכרון"); }
  };

  const saveOffline = async () => {
    if (!clientId) return;
    const gross = parseFloat(offlineForm.amount_gross);
    if (isNaN(gross)) { toast.error("סכום ברוטו נדרש"); return; }
    try {
      await upsertOffline.mutateAsync({
        client_id: clientId,
        year: yearNum,
        month: parseInt(offlineForm.month),
        amount_gross: gross,
        amount_net: offlineForm.amount_net ? parseFloat(offlineForm.amount_net) : undefined,
        source: offlineForm.source,
        notes: offlineForm.notes || undefined,
      });
      toast.success("הכנסה אופליין נשמרה");
      setOfflineDialog(false);
      setOfflineForm({ month: (new Date().getMonth() + 1).toString(), amount_gross: "", amount_net: "", source: "icount_other", notes: "" });
    } catch { toast.error("שגיאה"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">אנליטיקס</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openSettings}><Settings className="h-4 w-4 ml-1" />הגדרות</Button>
          {clientId && (
            <>
              <Button variant="outline" size="sm" onClick={() => setOfflineDialog(true)}>
                <Plus className="h-4 w-4 ml-1" />הכנסה אופליין
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (!clientId) return;
                icountSync.mutateAsync({ clientId, year: yearNum, month: currentMonth })
                  .then(() => toast.success("אייקאונט סונכרן"))
                  .catch(() => toast.error("שגיאה בסנכרון אייקאונט"));
              }} disabled={icountSync.isPending}>
                <FileText className={`h-4 w-4 ml-1 ${icountSync.isPending ? "animate-spin" : ""}`} />סנכרון iCount
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSync("current")} disabled={sync.isPending}>
                <RefreshCw className={`h-4 w-4 ml-1 ${sync.isPending ? "animate-spin" : ""}`} />חודש נוכחי
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSync("last24")} disabled={sync.isPending}>
                <RefreshCw className={`h-4 w-4 ml-1 ${sync.isPending ? "animate-spin" : ""}`} />24 חודשים
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSync("last36")} disabled={sync.isPending}>
                <RefreshCw className={`h-4 w-4 ml-1 ${sync.isPending ? "animate-spin" : ""}`} />36 חודשים
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
          <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {clientId && (
        <Tabs defaultValue="this_month" dir="rtl">
          <TabsList>
            <TabsTrigger value="this_month">החודש</TabsTrigger>
            <TabsTrigger value="year_view">מבט שנתי</TabsTrigger>
          </TabsList>

          <TabsContent value="this_month">
            {/* Top KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">מכירות נטו</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{currentSnap ? fmt(currentSnap.net_sales) : "—"}</p>
                  {lastYearSnap && currentSnap && <YoYBadge value={yoyPct(currentSnap.net_sales, lastYearSnap.net_sales)} />}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">מכירות ברוטו</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{currentSnap ? fmt(currentSnap.gross_sales) : "—"}</p>
                  {currentSnap && (Number(currentSnap.discounts) > 0 || Number(currentSnap.refunds) > 0) && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {Number(currentSnap.discounts) > 0 && <div>הנחות: {fmt(currentSnap.discounts)}</div>}
                      {Number(currentSnap.refunds) > 0 && <div>החזרים: {fmt(currentSnap.refunds)}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">הוצאות פרסום</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{currentSnap ? fmt(currentSnap.ad_spend_total) : "—"}</p>
                  {currentSnap && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {Number(currentSnap.ad_spend_meta) > 0 && <div>Meta: {fmt(currentSnap.ad_spend_meta)}</div>}
                      {Number(currentSnap.ad_spend_google) > 0 && <div>Google: {fmt(currentSnap.ad_spend_google)}</div>}
                      {Number(currentSnap.ad_spend_tiktok) > 0 && <div>TikTok: {fmt(currentSnap.ad_spend_tiktok)}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">עמלה לתשלום</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{currentCommission ? fmt(currentCommission.finalDue) : "—"}</p>
                  {currentCommission && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentCommission.isMinimum ? "מינימום" : `${currentCommission.tierUsed?.rate_percent}%`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Secondary metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">MER</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold">{currentMER ? currentMER.toFixed(2) : "—"}</p></CardContent>
              </Card>
              {currentSnap?.orders != null && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">הזמנות</CardTitle></CardHeader>
                  <CardContent><p className="text-xl font-bold">{currentSnap.orders}</p></CardContent>
                </Card>
              )}
              {currentSnap?.sessions != null && Number(currentSnap.sessions) > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">סשנים</CardTitle></CardHeader>
                  <CardContent><p className="text-xl font-bold">{Number(currentSnap.sessions).toLocaleString()}</p></CardContent>
                </Card>
              )}
              {currentSnap?.sessions != null && currentSnap?.orders != null && Number(currentSnap.sessions) > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CVR</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{((currentSnap.orders / Number(currentSnap.sessions)) * 100).toFixed(2)}%</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">הכנסות אופליין</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{currentOffline > 0 ? fmt(currentOffline) : "—"}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="year_view">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>חודש</TableHead>
                    <TableHead>מכירות ברוטו</TableHead>
                    <TableHead>הנחות</TableHead>
                    <TableHead>החזרים</TableHead>
                    <TableHead>מכירות נטו</TableHead>
                    <TableHead>YoY נטו</TableHead>
                    <TableHead>הזמנות</TableHead>
                    <TableHead>סשנים</TableHead>
                    <TableHead>פרסום</TableHead>
                    <TableHead>MER</TableHead>
                    <TableHead>אופליין</TableHead>
                    <TableHead>עמלה</TableHead>
                    <TableHead>שירותים</TableHead>
                    <TableHead className="w-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthNames.map((name, i) => {
                    const month = i + 1;
                    const snap = getSnapshot(month);
                    const prevSnap = getSnapshot(month, yearNum - 1);
                    const comm = getCommission(month);
                    const fees = getServiceFees(month);
                    const offline = getOfflineRevenue(month);
                    const mer = snap && Number(snap.ad_spend_total) > 0
                      ? (Number(snap.net_sales) / Number(snap.ad_spend_total)).toFixed(2) : "—";
                    return (
                      <TableRow key={month} className={month === currentMonth && yearNum === currentYear ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{snap ? fmt(snap.gross_sales) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{snap && Number(snap.discounts) > 0 ? fmt(snap.discounts) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{snap && Number(snap.refunds) > 0 ? fmt(snap.refunds) : "—"}</TableCell>
                        <TableCell className="font-medium">{snap ? fmt(snap.net_sales) : "—"}</TableCell>
                        <TableCell><YoYBadge value={yoyPct(snap?.net_sales, prevSnap?.net_sales)} /></TableCell>
                        <TableCell>{snap?.orders ?? "—"}</TableCell>
                        <TableCell>{snap?.sessions && Number(snap.sessions) > 0 ? Number(snap.sessions).toLocaleString() : "—"}</TableCell>
                        <TableCell>{snap ? fmt(snap.ad_spend_total) : "—"}</TableCell>
                        <TableCell>{mer}</TableCell>
                        <TableCell>{offline > 0 ? fmt(offline) : "—"}</TableCell>
                        <TableCell>{comm ? <span title={comm.isMinimum ? "מינימום" : `${comm.tierUsed?.rate_percent}%`}>{fmt(comm.finalDue)}</span> : "—"}</TableCell>
                        <TableCell>{fees > 0 ? fmt(fees) : "—"}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => setDrillMonth(month)}>פרט</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">סה״כ</TableCell>
                    <TableCell className="font-bold">{fmt(thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.gross_sales || 0), 0))}</TableCell>
                    <TableCell className="font-bold">{fmt(thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.discounts || 0), 0))}</TableCell>
                    <TableCell className="font-bold">{fmt(thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.refunds || 0), 0))}</TableCell>
                    <TableCell className="font-bold">{fmt(thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.net_sales || 0), 0))}</TableCell>
                    <TableCell />
                    <TableCell className="font-bold">{thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.orders || 0), 0)}</TableCell>
                    <TableCell className="font-bold">{thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.sessions || 0), 0).toLocaleString()}</TableCell>
                    <TableCell className="font-bold">{fmt(thisYearSnapshots.reduce((s: number, x: any) => s + Number(x.ad_spend_total || 0), 0))}</TableCell>
                    <TableCell />
                    <TableCell className="font-bold">{fmt(thisYearOffline.reduce((s: number, r: any) => s + Number(r.amount_gross || 0), 0))}</TableCell>
                    <TableCell className="font-bold">{fmt(monthNames.reduce((s, _, i) => s + (getCommission(i + 1)?.finalDue || 0), 0))}</TableCell>
                    <TableCell className="font-bold">{fmt(Array.from({ length: 12 }, (_, i) => getServiceFees(i + 1)).reduce((a, b) => a + b, 0))}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Drill-down dialog */}
      <Dialog open={drillMonth !== null} onOpenChange={() => setDrillMonth(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{drillMonth ? `${monthNames[drillMonth - 1]} ${year}` : ""} — פירוט</DialogTitle></DialogHeader>
          {drillMonth && (
            <MonthDrilldown
              snapshot={getSnapshot(drillMonth)}
              commission={getCommission(drillMonth)}
              services={services?.filter((s: any) => s.month === drillMonth) || []}
              activePlan={activePlan}
              offlineItems={thisYearOffline.filter((r: any) => r.month === drillMonth)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>הגדרות אינטגרציות</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Poconverto</h4>
              <div className="space-y-2">
                <Input placeholder="Base URL" value={settingsForm.base_url} onChange={(e) => setSettingsForm({ ...settingsForm, base_url: e.target.value })} />
                <Input placeholder="API Key" type="password" value={settingsForm.api_key} onChange={(e) => setSettingsForm({ ...settingsForm, api_key: e.target.value })} />
                <Input placeholder="Client Key (ללקוח הנבחר)" value={settingsForm.client_key} onChange={(e) => setSettingsForm({ ...settingsForm, client_key: e.target.value })} />
                <Input placeholder="Shop Domain (אופציונלי)" value={settingsForm.shop_domain} onChange={(e) => setSettingsForm({ ...settingsForm, shop_domain: e.target.value })} />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">iCount (חשבוניות)</h4>
              <div className="space-y-2">
                <Input placeholder="Company ID" value={settingsForm.icount_company_id} onChange={(e) => setSettingsForm({ ...settingsForm, icount_company_id: e.target.value })} />
                <Input placeholder="API Token" type="password" value={settingsForm.icount_api_token} onChange={(e) => setSettingsForm({ ...settingsForm, icount_api_token: e.target.value })} />
              </div>
            </div>
            <Button onClick={saveSettings} className="w-full">שמור הגדרות</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offline revenue dialog */}
      <Dialog open={offlineDialog} onOpenChange={setOfflineDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>הוספת הכנסה אופליין</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={offlineForm.month} onValueChange={(v) => setOfflineForm({ ...offlineForm, month: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{monthNames.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={offlineForm.source} onValueChange={(v) => setOfflineForm({ ...offlineForm, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="סכום ברוטו (₪) *" type="number" value={offlineForm.amount_gross} onChange={(e) => setOfflineForm({ ...offlineForm, amount_gross: e.target.value })} />
            <Input placeholder="סכום נטו (₪)" type="number" value={offlineForm.amount_net} onChange={(e) => setOfflineForm({ ...offlineForm, amount_net: e.target.value })} />
            <Input placeholder="הערות" value={offlineForm.notes} onChange={(e) => setOfflineForm({ ...offlineForm, notes: e.target.value })} />
            <Button onClick={saveOffline} className="w-full" disabled={upsertOffline.isPending}>שמור</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function YoYBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-destructive"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct(value)}
    </span>
  );
}

function MonthDrilldown({ snapshot, commission, services, activePlan, offlineItems }: {
  snapshot: any;
  commission: ReturnType<typeof calculateCommission> | null;
  services: any[];
  activePlan: any;
  offlineItems: any[];
}) {
  return (
    <div className="space-y-4">
      {snapshot && (
        <>
          <div>
            <h4 className="font-medium mb-2">מכירות</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>מכירות ברוטו</span><span>{fmt(snapshot.gross_sales)}</span></div>
              {Number(snapshot.discounts) > 0 && <div className="flex justify-between text-muted-foreground"><span>הנחות</span><span>-{fmt(snapshot.discounts)}</span></div>}
              {Number(snapshot.refunds) > 0 && <div className="flex justify-between text-muted-foreground"><span>החזרים</span><span>-{fmt(snapshot.refunds)}</span></div>}
              <div className="flex justify-between font-medium border-t pt-1"><span>מכירות נטו</span><span>{fmt(snapshot.net_sales)}</span></div>
            </div>
          </div>
          {(snapshot.orders || snapshot.sessions) && (
            <div>
              <h4 className="font-medium mb-2">תנועה</h4>
              <div className="space-y-1 text-sm">
                {snapshot.orders != null && <div className="flex justify-between"><span>הזמנות</span><span>{snapshot.orders}</span></div>}
                {snapshot.sessions != null && Number(snapshot.sessions) > 0 && <div className="flex justify-between"><span>סשנים</span><span>{Number(snapshot.sessions).toLocaleString()}</span></div>}
                {snapshot.sessions != null && snapshot.orders != null && Number(snapshot.sessions) > 0 && (
                  <div className="flex justify-between"><span>CVR</span><span>{((snapshot.orders / Number(snapshot.sessions)) * 100).toFixed(2)}%</span></div>
                )}
              </div>
            </div>
          )}
          <div>
            <h4 className="font-medium mb-2">הוצאות פרסום לפי ערוץ</h4>
            <div className="space-y-1 text-sm">
              {Number(snapshot.ad_spend_meta) > 0 && (
                <div className="flex justify-between"><span>Meta: {fmt(snapshot.ad_spend_meta)}</span>
                  <span className="text-muted-foreground text-xs">
                    {snapshot.meta_roas > 0 && `ROAS ${Number(snapshot.meta_roas).toFixed(2)}`}
                    {snapshot.meta_clicks > 0 && ` | ${snapshot.meta_clicks} clicks`}
                  </span>
                </div>
              )}
              {Number(snapshot.ad_spend_google) > 0 && (
                <div className="flex justify-between"><span>Google: {fmt(snapshot.ad_spend_google)}</span>
                  <span className="text-muted-foreground text-xs">
                    {snapshot.google_roas > 0 && `ROAS ${Number(snapshot.google_roas).toFixed(2)}`}
                    {snapshot.google_clicks > 0 && ` | ${snapshot.google_clicks} clicks`}
                  </span>
                </div>
              )}
              {Number(snapshot.ad_spend_tiktok) > 0 && (
                <div className="flex justify-between"><span>TikTok: {fmt(snapshot.ad_spend_tiktok)}</span>
                  <span className="text-muted-foreground text-xs">
                    {snapshot.tiktok_roas > 0 && `ROAS ${Number(snapshot.tiktok_roas).toFixed(2)}`}
                    {snapshot.tiktok_clicks > 0 && ` | ${snapshot.tiktok_clicks} clicks`}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-1"><span>סה״כ</span><span>{fmt(snapshot.ad_spend_total)}</span></div>
              {Number(snapshot.ad_spend_total) > 0 && Number(snapshot.net_sales) > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>MER</span><span>{(Number(snapshot.net_sales) / Number(snapshot.ad_spend_total)).toFixed(2)}</span></div>
              )}
              {snapshot.blended_roas > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>Blended ROAS</span><span>{Number(snapshot.blended_roas).toFixed(2)}</span></div>
              )}
            </div>
          </div>
        </>
      )}
      {offlineItems.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">הכנסות אופליין</h4>
          <div className="space-y-1 text-sm">
            {offlineItems.map((r: any) => (
              <div key={r.id} className="flex justify-between">
                <span>{sourceLabels[r.source] || r.source}{r.notes ? ` — ${r.notes}` : ""}</span>
                <span>{fmt(r.amount_gross)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium border-t pt-1">
              <span>סה״כ אופליין</span>
              <span>{fmt(offlineItems.reduce((s: number, r: any) => s + Number(r.amount_gross || 0), 0))}</span>
            </div>
          </div>
        </div>
      )}
      {commission && activePlan && (
        <div>
          <h4 className="font-medium mb-2">חישוב עמלה</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>מכירות נטו</span><span>{fmt(snapshot?.net_sales)}</span></div>
            {commission.tierUsed && <div className="flex justify-between"><span>דרגה: ≥{fmt(commission.tierUsed.threshold_sales)}</span><span>{commission.tierUsed.rate_percent}%</span></div>}
            <div className="flex justify-between"><span>עמלה מחושבת</span><span>{fmt(commission.commission)}</span></div>
            <div className="flex justify-between"><span>מינימום</span><span>{fmt(activePlan.minimum_fee)}</span></div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>לתשלום</span>
              <span>{fmt(commission.finalDue)} {commission.isMinimum && <Badge variant="outline" className="mr-1 text-xs">מינימום</Badge>}</span>
            </div>
          </div>
        </div>
      )}
      {services.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">שירותים חודשיים</h4>
          <div className="space-y-1 text-sm">
            {services.map((s: any) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.service_catalog?.name || s.service_name} {s.platform && `(${s.platform})`}</span>
                <span>{fmt(Number(s.unit_price || s.monthly_fee) * Number(s.quantity || 1))}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium border-t pt-1">
              <span>סה״כ שירותים</span>
              <span>{fmt(services.reduce((sum: number, s: any) => sum + Number(s.unit_price || s.monthly_fee) * Number(s.quantity || 1), 0))}</span>
            </div>
          </div>
        </div>
      )}
      {!snapshot && !commission && services.length === 0 && offlineItems.length === 0 && <p className="text-muted-foreground text-center">אין נתונים לחודש זה</p>}
    </div>
  );
}
