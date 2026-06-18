import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import PricingRules from '@/pages/pricing/PricingRules';
import PricingRates from '@/pages/pricing/PricingRates';
import SplitDemo from '@/pages/pricing/SplitDemo';
import BillList from '@/pages/bills/BillList';
import BillGenerator from '@/pages/bills/BillGenerator';
import Utilities from '@/pages/bills/Utilities';
import SplitRules from '@/pages/split/SplitRules';
import SplitDetails from '@/pages/split/SplitDetails';
import MonthlyReconciliation from '@/pages/reconciliation/MonthlyReconciliation';
import Settlements from '@/pages/reconciliation/Settlements';
import Properties from '@/pages/Properties';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pricing/rules" element={<PricingRules />} />
        <Route path="pricing/rates" element={<PricingRates />} />
        <Route path="pricing/split-demo" element={<SplitDemo />} />
        <Route path="bills/list" element={<BillList />} />
        <Route path="bills/generator" element={<BillGenerator />} />
        <Route path="bills/utilities" element={<Utilities />} />
        <Route path="split/rules" element={<SplitRules />} />
        <Route path="split/details" element={<SplitDetails />} />
        <Route path="reconciliation/monthly" element={<MonthlyReconciliation />} />
        <Route path="reconciliation/settlements" element={<Settlements />} />
        <Route path="properties" element={<Properties />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
