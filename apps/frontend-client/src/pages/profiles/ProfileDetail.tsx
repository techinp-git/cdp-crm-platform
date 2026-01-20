import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { profileApi } from '../../services/api';

export function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddIdentifierModal, setShowAddIdentifierModal] = useState(false);

  // Fetch profile details
  const { data: profile, isLoading, error } = useQuery(
    ['profile', id],
    () => profileApi.get(id!),
    {
      enabled: !!id,
    }
  );

  // Fetch completion score
  const { data: completionData } = useQuery(
    ['profile-completion', id],
    () => profileApi.getCompletionScore(id!),
    {
      enabled: !!id,
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: any) => profileApi.update(id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', id]);
        queryClient.invalidateQueries(['profile-completion', id]);
        alert('Profile updated successfully');
        setShowEditModal(false);
      },
      onError: (error) => {
        alert(`Failed to update profile: ${error}`);
      },
    }
  );

  // Add identifier mutation
  const addIdentifierMutation = useMutation(
    (data: any) => profileApi.addIdentifier(id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', id]);
        alert('Identifier added successfully');
        setShowAddIdentifierModal(false);
      },
      onError: (error) => {
        alert(`Failed to add identifier: ${error}`);
      },
    }
  );

  // Handle profile update
  const handleUpdate = (formData: any) => {
    updateMutation.mutate(formData);
  };

  // Handle add identifier
  const handleAddIdentifier = (identifierData: any) => {
    addIdentifierMutation.mutate(identifierData);
  };

  // Handle merge with duplicate
  const handleMerge = () => {
    if (confirm('This will merge this profile with another. Continue?')) {
      // Navigate to unify page or open merge modal
      alert('Merge feature - to be implemented');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary-text">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-secondary-text mb-4">
            The profile you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link
            to="/profiles"
            className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
          >
            Back to Profiles
          </Link>
        </div>
      </div>
    );
  }

  const completionScore = completionData?.completionScore || 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'identifiers', label: 'Identifiers', icon: '🔗' },
    { id: 'events', label: 'Events', icon: '📝' },
    { id: 'deals', label: 'Deals', icon: '💼' },
    { id: 'activities', label: 'Activities', icon: '📋' },
    { id: 'tags', label: 'Tags & Segments', icon: '🏷️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">
              {profile.type === 'COMPANY' ? '🏢' : '👤'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-base">{profile.name}</h1>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                profile.status === 'ACTIVE'
                  ? 'bg-success/20 text-success'
                  : 'bg-error/20 text-error'
              }`}>
                {profile.status}
              </span>
            </div>
            <p className="text-sm text-secondary-text mb-2">
              {profile.type === 'COMPANY' ? profile.companyName : `${profile.firstName} ${profile.lastName}`}
            </p>
            <div className="flex items-center gap-4 text-sm">
              {profile.email && (
                <div className="flex items-center gap-1">
                  <span>📧</span>
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-1">
                  <span>📞</span>
                  <span>{profile.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddIdentifierModal(true)}
            className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100"
          >
            🔗 Add Identifier
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleMerge}
            className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100"
          >
            🔗 Merge
          </button>
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            📤 Export
          </button>
        </div>
      </div>

      {/* Completion Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Profile Completion</h3>
          <span className={`text-2xl font-bold ${
            completionScore >= 80 ? 'text-success' :
            completionScore >= 60 ? 'text-warning' :
            'text-error'
          }`}>
            {completionScore}%
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              completionScore >= 80 ? 'bg-success' :
              completionScore >= 60 ? 'bg-warning' :
              'bg-error'
            }`}
            style={{ width: `${completionScore}%` }}
          ></div>
        </div>
        <p className="text-sm text-secondary-text mt-2">
          {completionScore >= 80 ? '✅ Profile is complete' :
           completionScore >= 60 ? '⚠️ Profile needs more information' :
           '❌ Profile is incomplete'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary-text hover:text-base hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-1">
                      Type
                    </label>
                    <p className="text-base">{profile.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-1">
                      Status
                    </label>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      profile.status === 'ACTIVE'
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-error'
                    }`}>
                      {profile.status}
                    </span>
                  </div>
                  {profile.type === 'INDIVIDUAL' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-secondary-text mb-1">
                          First Name
                        </label>
                        <p className="text-base">{profile.firstName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-text mb-1">
                          Last Name
                        </label>
                        <p className="text-base">{profile.lastName || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {profile.type === 'COMPANY' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-secondary-text mb-1">
                          Company Name
                        </label>
                        <p className="text-base">{profile.companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-text mb-1">
                          Tax ID
                        </label>
                        <p className="text-base">{profile.companyTaxId || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-1">
                      Email
                    </label>
                    <p className="text-base">{profile.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-1">
                      Phone
                    </label>
                    <p className="text-base">{profile.phone || 'N/A'}</p>
                  </div>
                  {profile.industry && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-text mb-1">
                        Industry
                      </label>
                      <p className="text-base">{profile.industry}</p>
                    </div>
                  )}
                  {profile.companySize && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-text mb-1">
                        Company Size
                      </label>
                      <p className="text-base">{profile.companySize}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-1">
                      Created
                    </label>
                    <p className="text-base">
                      {new Date(profile.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-1">
                      Last Updated
                    </label>
                    <p className="text-base">
                      {new Date(profile.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {profile.address && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <div className="space-y-2">
                    <p className="text-base">{profile.address.street}</p>
                    <p className="text-base">
                      {profile.address.city && `${profile.address.city}, `}
                      {profile.address.state && `${profile.address.state} `}
                      {profile.address.country}
                    </p>
                    <p className="text-base">{profile.address.postalCode}</p>
                  </div>
                </div>
              )}

              {/* Additional Contact Info */}
              {(profile.emails?.length > 0 || profile.phones?.length > 0) && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Additional Contact Information</h3>
                  {profile.emails && profile.emails.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-secondary-text mb-2">
                        Additional Emails
                      </label>
                      <div className="space-y-2">
                        {profile.emails.map((email: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-1 bg-background rounded">{email.type || 'OTHER'}</span>
                            <span>{email.email}</span>
                            {email.source && (
                              <span className="text-secondary-text">({email.source})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.phones && profile.phones.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-text mb-2">
                        Additional Phones
                      </label>
                      <div className="space-y-2">
                        {profile.phones.map((phone: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-1 bg-background rounded">{phone.type || 'OTHER'}</span>
                            <span>{phone.phone}</span>
                            {phone.source && (
                              <span className="text-secondary-text">({phone.source})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Attributes */}
              {profile.attributes && Object.keys(profile.attributes).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Custom Attributes</h3>
                  <div className="bg-background rounded-lg p-4 overflow-auto">
                    <pre className="text-sm">{JSON.stringify(profile.attributes, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Identifiers Tab */}
          {activeTab === 'identifiers' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">External Identifiers</h3>
                <span className="text-sm text-secondary-text">
                  {profile.identifiers?.length || 0} identifiers
                </span>
              </div>
              {profile.identifiers && profile.identifiers.length > 0 ? (
                <div className="space-y-4">
                  {profile.identifiers.map((identifier: any) => (
                    <div key={identifier.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-lg">
                              {identifier.source === 'ERP' ? '💼' :
                               identifier.source === 'LINE' ? '💬' :
                               identifier.source === 'FACEBOOK' ? '📘' :
                               identifier.source === 'CRM' ? '📊' :
                               identifier.source === 'MANUAL' ? '✋' :
                               identifier.source === 'API' ? '🔌' :
                               identifier.source === 'WEBSITE' ? '🌐' : '❓'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{identifier.source}</div>
                            <div className="text-sm text-secondary-text">{identifier.sourceType || 'CUSTOMER'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {identifier.isPrimary && (
                            <span className="px-2 py-1 bg-success/20 text-success rounded text-xs font-medium">
                              Primary
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            identifier.matchQuality >= 80 ? 'bg-success/20 text-success' :
                            identifier.matchQuality >= 60 ? 'bg-warning/20 text-warning' :
                            'bg-error/20 text-error'
                          }`}>
                            {identifier.matchQuality || 0}% match
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-secondary-text">External ID: </span>
                          <span className="font-mono">{identifier.externalId}</span>
                        </div>
                        {identifier.externalRef && (
                          <div>
                            <span className="text-secondary-text">Ref: </span>
                            <span className="font-mono">{identifier.externalRef}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-secondary-text">
                          <span>Matched: {new Date(identifier.matchedAt).toLocaleDateString()}</span>
                          {identifier.lastVerifiedAt && (
                            <span>• Verified: {new Date(identifier.lastVerifiedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary-text">
                  <div className="text-4xl mb-2">🔗</div>
                  <p>No external identifiers found</p>
                  <button
                    onClick={() => setShowAddIdentifierModal(true)}
                    className="mt-4 bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
                  >
                    Add First Identifier
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Events Timeline</h3>
                <span className="text-sm text-secondary-text">
                  {profile.events?.length || 0} events
                </span>
              </div>
              {profile.events && profile.events.length > 0 ? (
                <div className="space-y-4">
                  {profile.events.map((event: any, index: number) => (
                    <div key={event.id || index} className="flex items-start gap-4">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1 pb-4 border-l-2 border-border pl-4">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold">{event.type}</h4>
                          <span className="text-sm text-secondary-text">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {event.payload && (
                          <div className="mt-2 bg-background rounded p-3 overflow-auto">
                            <pre className="text-xs">{JSON.stringify(event.payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary-text">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No events recorded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Deals</h3>
                <span className="text-sm text-secondary-text">
                  {profile.deals?.length || 0} deals
                </span>
              </div>
              {profile.deals && profile.deals.length > 0 ? (
                <div className="space-y-4">
                  {profile.deals.map((deal: any) => (
                    <div key={deal.id} className="p-4 border border-border rounded-lg hover:bg-background transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{deal.title}</h4>
                          <p className="text-sm text-secondary-text">
                            {deal.stage?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {deal.amount ? `${deal.currency || 'THB'} ${deal.amount.toLocaleString()}` : 'N/A'}
                          </p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            deal.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                            deal.status === 'WON' ? 'bg-green-100 text-green-800' :
                            deal.status === 'LOST' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {deal.status}
                          </span>
                        </div>
                      </div>
                      {deal.expectedCloseDate && (
                        <p className="text-xs text-secondary-text">
                          Expected Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary-text">
                  <div className="text-4xl mb-2">💼</div>
                  <p>No deals found</p>
                  <Link
                    to="/deals/new"
                    state={{ profileId: profile.id }}
                    className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
                  >
                    Create Deal
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Activities</h3>
                <span className="text-sm text-secondary-text">
                  {profile.activities?.length || 0} activities
                </span>
              </div>
              {profile.activities && profile.activities.length > 0 ? (
                <div className="space-y-4">
                  {profile.activities.map((activity: any) => (
                    <div key={activity.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-lg">
                            {activity.type === 'CALL' ? '📞' :
                             activity.type === 'EMAIL' ? '📧' :
                             activity.type === 'MEETING' ? '📅' :
                             activity.type === 'TASK' ? '✅' :
                             activity.type === 'NOTE' ? '📝' : '📋'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-semibold">{activity.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              activity.status === 'COMPLETED' ? 'bg-success/20 text-success' :
                              activity.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                              'bg-error/20 text-error'
                            }`}>
                              {activity.status}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-secondary-text mb-2">
                              {activity.description}
                            </p>
                          )}
                          {activity.dueDate && (
                            <p className="text-xs text-secondary-text">
                              Due: {new Date(activity.dueDate).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary-text">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No activities found</p>
                  <button className="mt-4 bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-400">
                    Create Activity
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tags & Segments Tab */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              {/* Tags */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Tags</h3>
                  <button className="text-primary font-medium text-sm">+ Add Tag</button>
                </div>
                {profile.tagsRelations && profile.tagsRelations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.tagsRelations.map((tagRel: any) => (
                      <span
                        key={tagRel.tag.id}
                        className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                        style={{
                          backgroundColor: `${tagRel.tag.color}20`,
                          color: tagRel.tag.color,
                        }}
                      >
                        {tagRel.tag.name}
                        <button className="hover:opacity-70">×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-text">No tags assigned</p>
                )}
              </div>

              {/* Segments */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Segments</h3>
                  <button className="text-primary font-medium text-sm">+ Add to Segment</button>
                </div>
                {profile.segmentIds && profile.segmentIds.length > 0 ? (
                  <div className="space-y-2">
                    {profile.segmentIds.map((segmentId: string) => (
                      <div key={segmentId} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <span className="font-medium">{segmentId}</span>
                        <span className="px-2 py-1 bg-success/20 text-success rounded text-xs">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-text">Not added to any segments</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-secondary-text mb-1">Total Events</div>
                <div className="text-2xl font-bold">{profile.events?.length || 0}</div>
              </div>
              <div>
                <div className="text-sm text-secondary-text mb-1">Open Deals</div>
                <div className="text-2xl font-bold">
                  {profile.deals?.filter((d: any) => d.status === 'OPEN').length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-text mb-1">Pending Activities</div>
                <div className="text-2xl font-bold">
                  {profile.activities?.filter((a: any) => a.status === 'PENDING').length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-text mb-1">Tags</div>
                <div className="text-2xl font-bold">{profile.tagsRelations?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Source Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Data Sources</h3>
            <div className="space-y-3">
              {profile.identifiers?.reduce((acc: any, id: any) => {
                acc[id.source] = (acc[id.source] || 0) + 1;
                return acc;
              }, {})}
              {Object.entries(profile.identifiers?.reduce((acc: any, id: any) => {
                acc[id.source] = (acc[id.source] || 0) + 1;
                return acc;
              }, {}) || {}).map(([source, count]: [string, number]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>
                      {source === 'ERP' ? '💼' :
                       source === 'LINE' ? '💬' :
                       source === 'FACEBOOK' ? '📘' :
                       source === 'CRM' ? '📊' :
                       source === 'MANUAL' ? '✋' :
                       source === 'API' ? '🔌' :
                       source === 'WEBSITE' ? '🌐' : '❓'}
                    </span>
                    <span>{source}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Merge Information */}
          {profile.mergedFrom && profile.mergedFrom.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Merge History</h3>
              <div className="space-y-2 text-sm">
                <p className="text-secondary-text">This profile was created by merging:</p>
                {profile.mergedFrom.map((mergedId: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-secondary-text">•</span>
                    <code className="bg-background px-2 py-1 rounded text-xs">
                      {mergedId}
                    </code>
                  </div>
                ))}
                {profile.mergedAt && (
                  <p className="text-secondary-text mt-2">
                    Merged on: {new Date(profile.mergedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-secondary-text hover:text-base"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdate(profile); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={profile.type}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="COMPANY">Company</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={profile.status}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                      type="text"
                      defaultValue={profile.displayName}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Email</label>
                    <input
                      type="email"
                      defaultValue={profile.email}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Phone</label>
                    <input
                      type="tel"
                      defaultValue={profile.phone}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Name</label>
                    <input
                      type="text"
                      defaultValue={profile.companyName}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isLoading}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Identifier Modal */}
      {showAddIdentifierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Add External Identifier</h2>
                <button
                  onClick={() => setShowAddIdentifierModal(false)}
                  className="text-secondary-text hover:text-base"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddIdentifier({
                  source: formData.get('source') as string,
                  sourceType: formData.get('sourceType') as string,
                  externalId: formData.get('externalId') as string,
                  externalRef: formData.get('externalRef') as string,
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Source *</label>
                    <select
                      name="source"
                      required
                      className="w-full px-3 py-2 border border-border rounded-md"
                    >
                      <option value="">Select Source</option>
                      <option value="ERP">ERP</option>
                      <option value="LINE">LINE</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="CRM">CRM</option>
                      <option value="MANUAL">Manual</option>
                      <option value="API">API</option>
                      <option value="WEBSITE">Website</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Source Type</label>
                    <input
                      name="sourceType"
                      type="text"
                      placeholder="e.g., CUSTOMER, USER, CONTACT"
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">External ID *</label>
                    <input
                      name="externalId"
                      type="text"
                      required
                      placeholder="e.g., ERP001, LINE:Uxxxx"
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">External Reference</label>
                    <input
                      name="externalRef"
                      type="text"
                      placeholder="e.g., ERP:customers.ERP001"
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddIdentifierModal(false)}
                    className="px-4 py-2 border border-border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addIdentifierMutation.isLoading}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {addIdentifierMutation.isLoading ? 'Adding...' : 'Add Identifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
