import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { usePayouts, useUpsertPayout } from "@/hooks/usePayouts";
import { useMonthlyServicesByYear } from "@/hooks/useServices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { toast } from "sonner";

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export default function PayoutsPage() {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const { data: payouts } = usePayouts(clientId, parseInt(year));
  const { data: services } = useMonthlyServicesByYear(clientId, parseInt(year));
  const upsert = useUpsertPayout();

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const getPayoutAmount = (month: number) => {
    return payouts?.filter((p) => p.month === month).reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  };

  const getServiceFees = (month: number) => {
    return services?.filter((s) => s.month === month).reduce((sum, s) => sum + Number(s.monthly_fee), 0) || 0;
  };

  const handleSave = async (month: number) => {
    try {
      await upsert.mutateAsync({ client_id: clientId, year: parseInt(year), month, amount: parseFloat(editAmount) || 0 });
      toast.success("נשמר");
      setEditingMonth(null);
    } catch { toast.error("שגיאה"); }
  };

  const totalPayouts = Array.from({ length: 12 }, (_, i) => getPayoutAmount(i + 1)).reduce((a, b) => a + b, 0);
  const totalFees = Array.from({ length: 12 }, (_, i) => getServiceFees(i + 1)).reduce((a, b) => a + b, 0);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">סיכום תשלומים</h1>

      <div className="flex gap-3 mb-4">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>חודש</TableHead>
              <TableHead>עמלות (₪)</TableHead>
              <TableHead>דמי שירות (₪)</TableHead>
              <TableHead>הפרש (₪)</TableHead>
              <TableHead className="w-24">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthNames.map((name, i) => {
              const month = i + 1;
              const payout = getPayoutAmount(month);
              const fees = getServiceFees(month);
              const delta = payout - fees;
              return (
                <TableRow key={month}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>
                    {editingMonth === month ? (
                      <div className="flex gap-1 items-center">
                        <Input className="w-24 h-8" type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave(month)} />
                        <Button size="sm" variant="ghost" onClick={() => handleSave(month)}>שמור</Button>
                      </div>
                    ) : (
                      <span>{payout > 0 ? `₪${payout.toLocaleString()}` : "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>{fees > 0 ? `₪${fees.toLocaleString()}` : "—"}</TableCell>
                  <TableCell className={delta > 0 ? "text-green-600" : delta < 0 ? "text-destructive" : ""}>
                    {payout > 0 || fees > 0 ? `₪${delta.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingMonth(month); setEditAmount(payout.toString()); }}>
                      ערוך
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">סה״כ</TableCell>
              <TableCell className="font-bold">₪{totalPayouts.toLocaleString()}</TableCell>
              <TableCell className="font-bold">₪{totalFees.toLocaleString()}</TableCell>
              <TableCell className={`font-bold ${totalPayouts - totalFees > 0 ? "text-green-600" : totalPayouts - totalFees < 0 ? "text-destructive" : ""}`}>
                ₪{(totalPayouts - totalFees).toLocaleString()}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  );
}
