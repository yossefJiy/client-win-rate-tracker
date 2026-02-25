import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useAgreements, useCreateAgreement, useUpdateAgreement, useDeleteAgreement } from "@/hooks/useAgreements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { active: "פעיל", paused: "מושהה", ended: "הסתיים" };
const statusColors: Record<string, string> = { active: "default", paused: "secondary", ended: "outline" };

interface AgreementForm {
  percent_rate: string;
  revenue_source: string;
  start_year: string;
  start_month: string;
  end_year: string;
  end_month: string;
  status: string;
  notes: string;
}

const emptyForm: AgreementForm = { percent_rate: "", revenue_source: "", start_year: new Date().getFullYear().toString(), start_month: "1", end_year: "", end_month: "", status: "active", notes: "" };

export default function AgreementsPage() {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState<string>("");
  const { data: agreements, isLoading } = useAgreements(clientId);
  const create = useCreateAgreement();
  const update = useUpdateAgreement();
  const del = useDeleteAgreement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AgreementForm>(emptyForm);

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      percent_rate: a.percent_rate.toString(),
      revenue_source: a.revenue_source,
      start_year: a.start_year.toString(),
      start_month: a.start_month.toString(),
      end_year: a.end_year?.toString() || "",
      end_month: a.end_month?.toString() || "",
      status: a.status,
      notes: a.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.percent_rate || !form.revenue_source) { toast.error("אחוז ומקור הכנסה נדרשים"); return; }
    const payload = {
      client_id: clientId,
      percent_rate: parseFloat(form.percent_rate),
      revenue_source: form.revenue_source,
      start_year: parseInt(form.start_year),
      start_month: parseInt(form.start_month),
      end_year: form.end_year ? parseInt(form.end_year) : undefined,
      end_month: form.end_month ? parseInt(form.end_month) : undefined,
      status: form.status,
      notes: form.notes || undefined,
    };
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, ...payload });
        toast.success("ההסכם עודכן");
      } else {
        await create.mutateAsync(payload);
        toast.success("ההסכם נוסף");
      }
      setDialogOpen(false);
    } catch { toast.error("שגיאה בשמירה"); }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">הסכמי אחוזים</h1>
        {clientId && <Button onClick={openNew}><Plus className="h-4 w-4 ml-2" />הסכם חדש</Button>}
      </div>

      <div className="mb-4 max-w-xs">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
          <SelectContent>
            {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {clientId && (isLoading ? <p className="text-muted-foreground">טוען...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>אחוז</TableHead>
              <TableHead>מקור הכנסה</TableHead>
              <TableHead>תחילה</TableHead>
              <TableHead>סיום</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead className="w-24">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agreements?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.percent_rate}%</TableCell>
                <TableCell>{a.revenue_source}</TableCell>
                <TableCell>{a.start_month}/{a.start_year}</TableCell>
                <TableCell>{a.end_month && a.end_year ? `${a.end_month}/${a.end_year}` : "—"}</TableCell>
                <TableCell><Badge variant={statusColors[a.status] as any}>{statusLabels[a.status]}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync({ id: a.id, clientId }); toast.success("ההסכם נמחק"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {agreements?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">אין הסכמים</TableCell></TableRow>}
          </TableBody>
        </Table>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editId ? "עריכת הסכם" : "הסכם חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="אחוז עמלה *" type="number" value={form.percent_rate} onChange={(e) => setForm({ ...form, percent_rate: e.target.value })} />
            <Input placeholder="מקור הכנסה *" value={form.revenue_source} onChange={(e) => setForm({ ...form, revenue_source: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="שנת התחלה" type="number" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
              <Select value={form.start_month} onValueChange={(v) => setForm({ ...form, start_month: v })}>
                <SelectTrigger><SelectValue placeholder="חודש התחלה" /></SelectTrigger>
                <SelectContent>{months.map((m) => <SelectItem key={m} value={m.toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="שנת סיום (אופציונלי)" type="number" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
              <Select value={form.end_month} onValueChange={(v) => setForm({ ...form, end_month: v })}>
                <SelectTrigger><SelectValue placeholder="חודש סיום" /></SelectTrigger>
                <SelectContent>{months.map((m) => <SelectItem key={m} value={m.toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="paused">מושהה</SelectItem>
                <SelectItem value="ended">הסתיים</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={handleSave} className="w-full" disabled={create.isPending || update.isPending}>
              {editId ? "עדכן" : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
