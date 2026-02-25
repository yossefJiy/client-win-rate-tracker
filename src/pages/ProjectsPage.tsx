import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useSelectedClient } from "@/hooks/useSelectedClient";
import { useProjects, useProject, useCreateProject, useCreateCheckpoint, PROJECT_TEMPLATES } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowRight, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { planned: "מתוכנן", active: "פעיל", on_hold: "מושהה", completed: "הושלם", canceled: "בוטל" };
const checkStatusLabels: Record<string, string> = { on_track: "בתוואי", at_risk: "בסיכון", off_track: "חורג" };
const checkStatusColors: Record<string, string> = { on_track: "bg-green-500", at_risk: "bg-yellow-500", off_track: "bg-red-500" };
const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export default function ProjectsPage() {
  const { data: clients } = useClients();
  const { clientId, setClientId } = useSelectedClient();
  const { data: projects } = useProjects(clientId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: project } = useProject(selectedProjectId || undefined);
  const createProject = useCreateProject();
  const createCheckpoint = useCreateCheckpoint();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_year: new Date().getFullYear().toString(), start_month: (new Date().getMonth() + 1).toString(), template: "" });
  const [checkpointDialog, setCheckpointDialog] = useState(false);
  const [cpForm, setCpForm] = useState({ status: "on_track", what_was_done: "", blockers: "", next_month_focus: "" });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleCreateProject = async () => {
    if (!form.name.trim()) { toast.error("שם פרויקט נדרש"); return; }
    const template = form.template ? PROJECT_TEMPLATES[form.template as keyof typeof PROJECT_TEMPLATES] : null;
    try {
      await createProject.mutateAsync({
        client_id: clientId, name: form.name, description: form.description || undefined,
        start_year: parseInt(form.start_year), start_month: parseInt(form.start_month), stages: template?.stages,
      });
      toast.success("הפרויקט נוצר");
      setDialogOpen(false);
    } catch { toast.error("שגיאה"); }
  };

  const handleAddCheckpoint = async () => {
    if (!selectedProjectId) return;
    const now = new Date();
    const existingCheckpoint = project?.project_monthly_checkpoints?.find(
      (c: any) => c.year === now.getFullYear() && c.month === now.getMonth() + 1
    );
    if (existingCheckpoint) { toast.error("כבר קיים צ׳קפוינט לחודש הנוכחי"); return; }
    try {
      await createCheckpoint.mutateAsync({
        project_id: selectedProjectId, year: now.getFullYear(), month: now.getMonth() + 1,
        status: cpForm.status, what_was_done: cpForm.what_was_done || undefined,
        blockers: cpForm.blockers || undefined, next_month_focus: cpForm.next_month_focus || undefined,
      });
      toast.success("צ׳קפוינט נוסף");
      setCheckpointDialog(false);
      setCpForm({ status: "on_track", what_was_done: "", blockers: "", next_month_focus: "" });
    } catch { toast.error("שגיאה"); }
  };

  const sortedStages = project?.project_stages?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const sortedCheckpoints = project?.project_monthly_checkpoints?.sort((a: any, b: any) => b.year * 100 + b.month - (a.year * 100 + a.month)) || [];

  if (selectedProjectId && project) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelectedProjectId(null)} className="mb-4">
          <ArrowRight className="h-4 w-4 ml-1" />חזרה לרשימה
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge>{statusLabels[project.status]}</Badge>
        </div>
        {project.description && <p className="text-muted-foreground mb-6">{project.description}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">תוכנית שלבים</CardTitle></CardHeader>
            <CardContent>
              {sortedStages.length > 0 ? (
                <div className="space-y-3">
                  {sortedStages.map((s: any) => (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{s.order_index}</div>
                      <div>
                        <p className="font-medium">{s.stage_name}</p>
                        {s.planned_month && s.planned_year && <p className="text-sm text-muted-foreground">{monthNames[s.planned_month - 1]} {s.planned_year}</p>}
                        {s.expected_outcome && <p className="text-sm text-muted-foreground mt-1">{s.expected_outcome}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">אין שלבים מוגדרים</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">צ׳קפוינטים חודשיים</CardTitle>
              <Button size="sm" onClick={() => setCheckpointDialog(true)}>
                <CalendarCheck className="h-4 w-4 ml-1" />הוסף צ׳קפוינט
              </Button>
            </CardHeader>
            <CardContent>
              {sortedCheckpoints.length > 0 ? (
                <div className="space-y-3">
                  {sortedCheckpoints.map((c: any) => (
                    <div key={c.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${checkStatusColors[c.status]}`} />
                        <span className="font-medium">{monthNames[c.month - 1]} {c.year}</span>
                        <span className="text-sm text-muted-foreground">— {checkStatusLabels[c.status]}</span>
                      </div>
                      {c.what_was_done && <p className="text-sm"><span className="font-medium">בוצע:</span> {c.what_was_done}</p>}
                      {c.blockers && <p className="text-sm text-destructive"><span className="font-medium">חסמים:</span> {c.blockers}</p>}
                      {c.next_month_focus && <p className="text-sm"><span className="font-medium">מיקוד הבא:</span> {c.next_month_focus}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">אין צ׳קפוינטים עדיין</p>}
            </CardContent>
          </Card>
        </div>

        <Dialog open={checkpointDialog} onOpenChange={setCheckpointDialog}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>צ׳קפוינט לחודש הנוכחי</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={cpForm.status} onValueChange={(v) => setCpForm({ ...cpForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(checkStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="מה בוצע" value={cpForm.what_was_done} onChange={(e) => setCpForm({ ...cpForm, what_was_done: e.target.value })} />
              <Textarea placeholder="חסמים" value={cpForm.blockers} onChange={(e) => setCpForm({ ...cpForm, blockers: e.target.value })} />
              <Textarea placeholder="מיקוד לחודש הבא" value={cpForm.next_month_focus} onChange={(e) => setCpForm({ ...cpForm, next_month_focus: e.target.value })} />
              <Button onClick={handleAddCheckpoint} className="w-full">הוסף צ׳קפוינט</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">פרויקטים</h1>
        {clientId && <Button onClick={() => { setForm({ name: "", description: "", start_year: new Date().getFullYear().toString(), start_month: (new Date().getMonth() + 1).toString(), template: "" }); setDialogOpen(true); }}><Plus className="h-4 w-4 ml-2" />פרויקט חדש</Button>}
      </div>

      <div className="mb-4 max-w-xs">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
          <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {clientId && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>תחילה</TableHead>
              <TableHead>שלבים</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((p: any) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProjectId(p.id)}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline">{statusLabels[p.status]}</Badge></TableCell>
                <TableCell>{p.start_month}/{p.start_year}</TableCell>
                <TableCell>{p.project_stages?.length || 0} שלבים</TableCell>
                <TableCell><Button variant="ghost" size="sm">פתח</Button></TableCell>
              </TableRow>
            ))}
            {projects?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">אין פרויקטים</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>פרויקט חדש</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.template} onValueChange={(v) => {
              const tmpl = PROJECT_TEMPLATES[v as keyof typeof PROJECT_TEMPLATES];
              setForm({ ...form, template: v, name: tmpl ? tmpl.name : form.name });
            }}>
              <SelectTrigger><SelectValue placeholder="בחר תבנית (אופציונלי)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid_media_growth">Paid Media Growth (Ecom)</SelectItem>
                <SelectItem value="cro_project">CRO Project</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="שם פרויקט *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Textarea placeholder="תיאור" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="שנה" type="number" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
              <Select value={form.start_month} onValueChange={(v) => setForm({ ...form, start_month: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{months.map((m) => <SelectItem key={m} value={m.toString()}>{monthNames[m - 1]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateProject} className="w-full" disabled={createProject.isPending}>צור פרויקט</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
