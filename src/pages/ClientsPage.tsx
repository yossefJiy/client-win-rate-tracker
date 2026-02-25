import { useState } from "react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ClientForm {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  notes: string;
}

const empty: ClientForm = { name: "", contact_name: "", email: "", phone: "", notes: "" };

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const create = useCreateClient();
  const update = useUpdateClient();
  const del = useDeleteClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditId(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (c: any) => { setEditId(c.id); setForm({ name: c.name, contact_name: c.contact_name || "", email: c.email || "", phone: c.phone || "", notes: c.notes || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("שם לקוח נדרש"); return; }
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, ...form });
        toast.success("הלקוח עודכן");
      } else {
        await create.mutateAsync(form);
        toast.success("הלקוח נוסף");
      }
      setDialogOpen(false);
    } catch { toast.error("שגיאה בשמירה"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await del.mutateAsync(deleteId);
      toast.success("הלקוח נמחק");
    } catch { toast.error("שגיאה במחיקה"); }
    setDeleteId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-2" />הוסף לקוח</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">טוען...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>איש קשר</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead className="w-24">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.contact_name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {clients?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">אין לקוחות עדיין</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editId ? "עריכת לקוח" : "לקוח חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="שם לקוח *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="איש קשר" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <Input placeholder="אימייל" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={handleSave} className="w-full" disabled={create.isPending || update.isPending}>
              {editId ? "עדכן" : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription>פעולה זו תמחק את הלקוח וכל הנתונים המשויכים אליו. האם להמשיך?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
