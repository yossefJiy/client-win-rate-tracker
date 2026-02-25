import { useClients } from "@/hooks/useClients";
import { useSelectedClient } from "@/hooks/useSelectedClient";
import { useCommissionPlans, useCreateCommissionPlan, useUpdateCommissionPlan, useCreateCommissionTier, useUpdateCommissionTier, useDeleteCommissionTier } from "@/hooks/useCommissionPlans";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function CommissionPlansPage() {
  const { data: clients } = useClients();
  const { clientId, setClientId } = useSelectedClient();
  const { data: plans, isLoading } = useCommissionPlans(clientId);
  const createPlan = useCreateCommissionPlan();
  const updatePlan = useUpdateCommissionPlan();
  const createTier = useCreateCommissionTier();
  const updateTier = useUpdateCommissionTier();
  const deleteTier = useDeleteCommissionTier();

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", minimum_fee: "0", currency: "ILS", base: "net_sales" });
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierForm, setTierForm] = useState({ plan_id: "", threshold_sales: "", rate_percent: "", order_index: "" });
  const [editTierId, setEditTierId] = useState<string | null>(null);

  const handleCreatePlan = async () => {
    if (!planForm.name.trim()) { toast.error("שם תוכנית נדרש"); return; }
    try {
      await createPlan.mutateAsync({
        client_id: clientId,
        name: planForm.name,
        minimum_fee: parseFloat(planForm.minimum_fee) || 0,
        currency: planForm.currency,
        base: planForm.base,
      });
      toast.success("תוכנית נוצרה");
      setPlanDialogOpen(false);
    } catch { toast.error("שגיאה"); }
  };

  const handleToggleActive = async (plan: any) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, clientId, is_active: !plan.is_active });
      toast.success(plan.is_active ? "תוכנית הושבתה" : "תוכנית הופעלה");
    } catch { toast.error("שגיאה"); }
  };

  const handleUpdateMinFee = async (plan: any, newFee: string) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, clientId, minimum_fee: parseFloat(newFee) || 0 });
    } catch { toast.error("שגיאה"); }
  };

  const openAddTier = (planId: string, currentTiersCount: number) => {
    setEditTierId(null);
    setTierForm({ plan_id: planId, threshold_sales: "", rate_percent: "", order_index: (currentTiersCount + 1).toString() });
    setTierDialogOpen(true);
  };

  const openEditTier = (tier: any) => {
    setEditTierId(tier.id);
    setTierForm({
      plan_id: tier.plan_id,
      threshold_sales: tier.threshold_sales.toString(),
      rate_percent: tier.rate_percent.toString(),
      order_index: tier.order_index.toString(),
    });
    setTierDialogOpen(true);
  };

  const handleSaveTier = async () => {
    try {
      if (editTierId) {
        await updateTier.mutateAsync({
          id: editTierId,
          threshold_sales: parseFloat(tierForm.threshold_sales),
          rate_percent: parseFloat(tierForm.rate_percent),
          order_index: parseInt(tierForm.order_index),
        });
        toast.success("דרגה עודכנה");
      } else {
        await createTier.mutateAsync({
          plan_id: tierForm.plan_id,
          threshold_sales: parseFloat(tierForm.threshold_sales),
          rate_percent: parseFloat(tierForm.rate_percent),
          order_index: parseInt(tierForm.order_index),
        });
        toast.success("דרגה נוספה");
      }
      setTierDialogOpen(false);
    } catch { toast.error("שגיאה"); }
  };

  const handleDeleteTier = async (tierId: string) => {
    try {
      await deleteTier.mutateAsync({ id: tierId });
      toast.success("דרגה נמחקה");
    } catch { toast.error("שגיאה"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">תוכניות עמלה</h1>
        <div className="flex gap-2">
          {clientId && (
            <Button onClick={() => { setPlanForm({ name: "", minimum_fee: "0", currency: "ILS", base: "net_sales" }); setPlanDialogOpen(true); }}>
              <Plus className="h-4 w-4 ml-2" />תוכנית חדשה
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 max-w-xs">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
          <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {clientId && (isLoading ? <p className="text-muted-foreground">טוען...</p> : (
        <div className="space-y-4">
          {plans?.map((plan: any) => {
            const sortedTiers = (plan.commission_tiers || []).sort((a: any, b: any) => a.order_index - b.order_index);
            return (
              <Card key={plan.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "פעיל" : "מושבת"}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">פעיל</span>
                    <Switch checked={plan.is_active} onCheckedChange={() => handleToggleActive(plan)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">מינימום: </span>
                      <Input
                        className="inline-block w-24 h-7 text-sm"
                        type="number"
                        defaultValue={plan.minimum_fee}
                        onBlur={(e) => handleUpdateMinFee(plan, e.target.value)}
                      />
                      <span className="mr-1">₪</span>
                    </div>
                    <div><span className="text-muted-foreground">בסיס: </span>{plan.base}</div>
                    <div><span className="text-muted-foreground">מטבע: </span>{plan.currency}</div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>סף מכירות (₪)</TableHead>
                        <TableHead>אחוז עמלה</TableHead>
                        <TableHead className="w-24">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTiers.map((tier: any) => (
                        <TableRow key={tier.id}>
                          <TableCell>{tier.order_index}</TableCell>
                          <TableCell>₪{Number(tier.threshold_sales).toLocaleString()}</TableCell>
                          <TableCell>{tier.rate_percent}%</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditTier(tier)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTier(tier.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => openAddTier(plan.id, sortedTiers.length)}>
                    <Plus className="h-3 w-3 ml-1" />הוסף דרגה
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {plans?.length === 0 && <p className="text-muted-foreground text-center">אין תוכניות עמלה</p>}
        </div>
      ))}

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>תוכנית עמלה חדשה</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="שם תוכנית *" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
            <Input placeholder="מינימום (₪)" type="number" value={planForm.minimum_fee} onChange={(e) => setPlanForm({ ...planForm, minimum_fee: e.target.value })} />
            <Select value={planForm.base} onValueChange={(v) => setPlanForm({ ...planForm, base: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="net_sales">מכירות נטו</SelectItem>
                <SelectItem value="gross_sales">מכירות ברוטו</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreatePlan} className="w-full" disabled={createPlan.isPending}>צור תוכנית</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editTierId ? "עריכת דרגה" : "דרגה חדשה"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="סף מכירות (₪)" type="number" value={tierForm.threshold_sales} onChange={(e) => setTierForm({ ...tierForm, threshold_sales: e.target.value })} />
            <Input placeholder="אחוז עמלה" type="number" value={tierForm.rate_percent} onChange={(e) => setTierForm({ ...tierForm, rate_percent: e.target.value })} />
            <Input placeholder="סדר" type="number" value={tierForm.order_index} onChange={(e) => setTierForm({ ...tierForm, order_index: e.target.value })} />
            <Button onClick={handleSaveTier} className="w-full">{editTierId ? "עדכן" : "הוסף"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
