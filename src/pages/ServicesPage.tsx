import { useState } from "react";
import { useClients, useClient } from "@/hooks/useClients";
import { useSelectedClient } from "@/hooks/useSelectedClient";
import { useServiceCatalog, useUpdateServiceCatalog, useMonthlyServices, useCreateMonthlyService, useUpdateMonthlyService, useDeleteMonthlyService, resolvePrice } from "@/hooks/useServices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Zap, Pencil } from "lucide-react";
import { toast } from "sonner";

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const statusLabels: Record<string, string> = { planned: "מתוכנן", in_progress: "בביצוע", delivered: "סופק", paused: "מושהה" };
const platformLabels: Record<string, string> = { meta: "Meta", google: "Google", tiktok: "TikTok", other: "אחר" };
const basisLabels: Record<string, string> = { regular: "רגיל", plan: "תוכנית", override: "ידני" };

export default function ServicesPage() {
  const { data: clients } = useClients();
  const { clientId, setClientId } = useSelectedClient();
  const { data: client } = useClient(clientId);
  const { data: catalog } = useServiceCatalog();
  const updateCatalog = useUpdateServiceCatalog();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const { data: services, isLoading } = useMonthlyServices(clientId, parseInt(year), parseInt(month));
  const create = useCreateMonthlyService();
  const updateSvc = useUpdateMonthlyService();
  const del = useDeleteMonthlyService();

  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [editCatalog, setEditCatalog] = useState<any>(null);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());
  const planType = (client as any)?.plan_type || "regular_pricing";

  const quickAdd = async (serviceName: string, platform: string, serviceId?: string) => {
    if (!clientId) { toast.error("בחר לקוח קודם"); return; }
    const catalogItem = catalog?.find(c => c.id === serviceId);
    if (!catalogItem) { toast.error("שירות לא נמצא בקטלוג"); return; }
    
    const { unitPrice, pricingBasis } = resolvePrice(planType, catalogItem as any);
    try {
      await create.mutateAsync({
        client_id: clientId, year: parseInt(year), month: parseInt(month),
        service_id: serviceId, service_name: serviceName, platform,
        monthly_fee: unitPrice, unit_price: unitPrice, quantity: 1,
        pricing_basis: pricingBasis, status: "planned",
      });
      toast.success(`${serviceName} נוסף (${basisLabels[pricingBasis]})`);
    } catch { toast.error("שגיאה"); }
  };

  const metaCatalog = catalog?.find((c) => c.name.includes("Meta"));
  const googleCatalog = catalog?.find((c) => c.name.includes("Google Ads"));
  const tiktokCatalog = catalog?.find((c) => c.name.includes("TikTok Ads"));

  const handleStatusChange = async (id: string, status: string) => {
    try { await updateSvc.mutateAsync({ id, status }); } catch { toast.error("שגיאה"); }
  };

  const handlePriceOverride = async (id: string, newPrice: string) => {
    const val = parseFloat(newPrice);
    if (isNaN(val)) return;
    try {
      await updateSvc.mutateAsync({ id, unit_price: val, monthly_fee: val, pricing_basis: "override" });
    } catch { toast.error("שגיאה"); }
  };

  const openEditCatalog = (item: any) => {
    setEditCatalog({ ...item });
    setCatalogDialogOpen(true);
  };

  const saveCatalogItem = async () => {
    if (!editCatalog) return;
    try {
      await updateCatalog.mutateAsync({
        id: editCatalog.id,
        regular_unit_price: editCatalog.regular_unit_price,
        plan_unit_price: editCatalog.plan_unit_price,
      });
      toast.success("קטלוג עודכן");
      setCatalogDialogOpen(false);
    } catch { toast.error("שגיאה"); }
  };

  const total = services?.reduce((sum: number, s: any) => sum + Number(s.unit_price || s.monthly_fee) * Number(s.quantity || 1), 0) || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">שירותים חודשיים</h1>

      <Tabs defaultValue="monthly" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="monthly">שורות חודשיות</TabsTrigger>
          <TabsTrigger value="catalog">קטלוג שירותים</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שירות</TableHead>
                <TableHead>חיוב</TableHead>
                <TableHead>מחיר רגיל (₪)</TableHead>
                <TableHead>מחיר תוכנית (₪)</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.billing}</TableCell>
                  <TableCell>{(item as any).regular_unit_price != null ? `₪${Number((item as any).regular_unit_price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>{(item as any).plan_unit_price != null ? `₪${Number((item as any).plan_unit_price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEditCatalog(item)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="monthly">
          <div className="flex gap-3 mb-4 flex-wrap">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{monthNames.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            {clientId && (
              <Badge variant="outline" className="self-center">
                {planType === "commission_plan" ? "תוכנית אחוזים" : "תמחור רגיל"}
              </Badge>
            )}
          </div>

          {clientId && (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => quickAdd("Meta Ads Management", "meta", metaCatalog?.id)}>
                  <Zap className="h-3 w-3 ml-1" />Meta Ads
                </Button>
                <Button variant="outline" size="sm" onClick={() => quickAdd("Google Ads Management", "google", googleCatalog?.id)}>
                  <Zap className="h-3 w-3 ml-1" />Google Ads
                </Button>
                <Button variant="outline" size="sm" onClick={() => quickAdd("TikTok Ads Management", "tiktok", tiktokCatalog?.id)}>
                  <Zap className="h-3 w-3 ml-1" />TikTok Ads
                </Button>
              </div>

              {isLoading ? <p className="text-muted-foreground">טוען...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שירות</TableHead>
                      <TableHead>פלטפורמה</TableHead>
                      <TableHead>כמות</TableHead>
                      <TableHead>מחיר יחידה (₪)</TableHead>
                      <TableHead>סה״כ שורה</TableHead>
                      <TableHead>בסיס תמחור</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services?.map((s: any) => {
                      const qty = Number(s.quantity || 1);
                      const price = Number(s.unit_price || s.monthly_fee);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.service_catalog?.name || s.service_name}</TableCell>
                          <TableCell>{s.platform ? platformLabels[s.platform] || s.platform : "—"}</TableCell>
                          <TableCell>{qty}</TableCell>
                          <TableCell>
                            <Input
                              className="w-24 h-7 text-sm"
                              type="number"
                              defaultValue={price}
                              onBlur={(e) => handlePriceOverride(s.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>₪{(qty * price).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {basisLabels[s.pricing_basis] || s.pricing_basis}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select value={s.status} onValueChange={(v) => handleStatusChange(s.id, v)}>
                              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync(s.id); toast.success("נמחק"); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {services?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">אין שירותים לחודש זה</TableCell></TableRow>}
                  </TableBody>
                  {services && services.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="font-bold text-left">סה״כ</TableCell>
                        <TableCell className="font-bold">₪{total.toLocaleString()}</TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>עריכת מחירי שירות</DialogTitle></DialogHeader>
          {editCatalog && (
            <div className="space-y-3">
              <p className="font-medium">{editCatalog.name}</p>
              <div>
                <label className="text-sm text-muted-foreground">מחיר רגיל (₪)</label>
                <Input type="number" value={editCatalog.regular_unit_price ?? ""} onChange={(e) => setEditCatalog({ ...editCatalog, regular_unit_price: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מחיר תוכנית (₪)</label>
                <Input type="number" value={editCatalog.plan_unit_price ?? ""} onChange={(e) => setEditCatalog({ ...editCatalog, plan_unit_price: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <Button onClick={saveCatalogItem} className="w-full">שמור</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
