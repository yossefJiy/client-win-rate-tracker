import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useSelectedClient } from "@/hooks/useSelectedClient";
import { useServiceCatalog, useMonthlyServices, useCreateMonthlyService, useUpdateMonthlyService, useDeleteMonthlyService } from "@/hooks/useServices";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const statusLabels: Record<string, string> = { planned: "מתוכנן", in_progress: "בביצוע", delivered: "סופק", paused: "מושהה" };
const platformLabels: Record<string, string> = { meta: "Meta", google: "Google", tiktok: "TikTok", other: "אחר" };

export default function ServicesPage() {
  const { data: clients } = useClients();
  const { clientId, setClientId } = useSelectedClient();
  const { data: catalog } = useServiceCatalog();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const { data: services, isLoading } = useMonthlyServices(clientId, parseInt(year), parseInt(month));
  const create = useCreateMonthlyService();
  const updateSvc = useUpdateMonthlyService();
  const del = useDeleteMonthlyService();

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  const quickAdd = async (serviceName: string, platform: string, fee: number, serviceId?: string) => {
    if (!clientId) { toast.error("בחר לקוח קודם"); return; }
    try {
      await create.mutateAsync({
        client_id: clientId, year: parseInt(year), month: parseInt(month),
        service_id: serviceId, service_name: serviceName, platform, monthly_fee: fee, status: "planned",
      });
      toast.success(`${serviceName} נוסף`);
    } catch { toast.error("שגיאה או שכבר קיים"); }
  };

  const metaCatalog = catalog?.find((c) => c.name.includes("Meta"));
  const googleCatalog = catalog?.find((c) => c.name.includes("Google"));
  const tiktokCatalog = catalog?.find((c) => c.name.includes("TikTok"));

  const handleStatusChange = async (id: string, status: string) => {
    try { await updateSvc.mutateAsync({ id, status }); } catch { toast.error("שגיאה"); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">שירותים חודשיים</h1>
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
      </div>

      {clientId && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => quickAdd("Meta Ads Management", "meta", metaCatalog?.default_monthly_fee || 2900, metaCatalog?.id)}>
              <Zap className="h-3 w-3 ml-1" />Meta Ads (₪{metaCatalog?.default_monthly_fee || 2900})
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickAdd("Google Ads Management", "google", googleCatalog?.default_monthly_fee || 2900, googleCatalog?.id)}>
              <Zap className="h-3 w-3 ml-1" />Google Ads (₪{googleCatalog?.default_monthly_fee || 2900})
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickAdd("TikTok Ads Management", "tiktok", tiktokCatalog?.default_monthly_fee || 0, tiktokCatalog?.id)}>
              <Zap className="h-3 w-3 ml-1" />TikTok Ads
            </Button>
          </div>

          {isLoading ? <p className="text-muted-foreground">טוען...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שירות</TableHead>
                  <TableHead>פלטפורמה</TableHead>
                  <TableHead>עמלה (₪)</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>הערות</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.service_catalog?.name || s.service_name}</TableCell>
                    <TableCell>{s.platform ? platformLabels[s.platform] || s.platform : "—"}</TableCell>
                    <TableCell>₪{Number(s.monthly_fee).toLocaleString()}</TableCell>
                    <TableCell>
                      <Select value={s.status} onValueChange={(v) => handleStatusChange(s.id, v)}>
                        <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.delivery_notes || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync(s.id); toast.success("נמחק"); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {services?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">אין שירותים לחודש זה</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
