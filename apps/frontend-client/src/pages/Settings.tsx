import { Routes, Route, Navigate } from 'react-router-dom';
import { OrganizationSettings } from './settings/OrganizationSettings';
import { TeamManagement } from './settings/TeamManagement';
import { ChannelSetup } from './settings/ChannelSetup';
import { ApiWebhook } from './settings/ApiWebhook';
import { LabelKeywords } from './settings/KeywordsMapping';
import { Integrations } from './settings/Integrations';
import { CustomFields } from './settings/CustomFields';
import { SecurityPrivacy } from './settings/SecurityPrivacy';

export function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Settings</h1>
      <Routes>
        <Route index element={<Navigate to="organization" replace />} />
        <Route path="organization" element={<OrganizationSettings />} />
        <Route path="team" element={<TeamManagement />} />
        <Route path="channels" element={<ChannelSetup />} />
        <Route path="api" element={<ApiWebhook />} />
        <Route path="data-mapping" element={<Navigate to="/settings/label-keywords" replace />} />
        <Route path="keywords-mapping" element={<Navigate to="/settings/label-keywords" replace />} />
        <Route path="label-keywords" element={<LabelKeywords />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="custom-fields" element={<CustomFields />} />
        <Route path="security" element={<SecurityPrivacy />} />
      </Routes>
    </div>
  );
}
