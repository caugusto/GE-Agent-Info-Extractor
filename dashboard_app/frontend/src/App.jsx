import React, { useState, useEffect } from 'react';
import HeaderStats from './components/HeaderStats';
import FilterBar from './components/FilterBar';
import AgentCard from './components/AgentCard';
import AgentDetailDrawer from './components/AgentDetailDrawer';
import { Bot, Grid, List, RefreshCw, User, Download, RotateCcw, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [filterOptions, setFilterOptions] = useState({});
  const [stats, setStats] = useState({});
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Default Filters State (supporting multi-select array filters)
  const initialFilters = {
    gcp_project_id: [],
    instance_name: [],
    platform: [],
    scope: [],
    status: [],
    author: [],
    environment: [],
    search: '',
    is_shared: '', // '' or boolean
    is_available_to_everyone: '', // '' or boolean
    uses_rag: false,
    uses_mcp: false,
    uses_tools: false,
    uses_code: false,
  };

  const [filters, setFilters] = useState(initialFilters);

  // Fetch Authenticated User Profile
  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error('Error fetching user profile:', err));
  }, []);

  // Fetch Collections List
  useEffect(() => {
    fetch('/api/collections')
      .then(res => res.json())
      .then(data => {
        if (data.collections) {
          setCollections(data.collections);
        }
      })
      .catch(err => console.error('Error fetching collections:', err));
  }, []);

  // Fetch Filter Options whenever selectedCollection changes
  useEffect(() => {
    const colParam = selectedCollection ? `?collection_id=${selectedCollection}` : '';
    fetch(`/api/filter_options${colParam}`)
      .then(res => res.json())
      .then(data => setFilterOptions(data))
      .catch(err => console.error('Error fetching filter options:', err));
  }, [selectedCollection]);

  // Fetch Stats whenever selectedCollection, filters.platform, or filters.uses_mcp changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCollection) params.append('collection_id', selectedCollection);
    if (Array.isArray(filters.platform)) {
      filters.platform.forEach(p => params.append('platform', p));
    }
    if (filters.uses_mcp) params.append('uses_mcp', 'true');

    fetch(`/api/stats?${params.toString()}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, [selectedCollection, filters.platform, filters.uses_mcp]);

  // Fetch Agents whenever filters or selectedCollection change
  const fetchAgents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    
    if (selectedCollection) params.append('collection_id', selectedCollection);
    
    const appendMulti = (key, val) => {
      if (Array.isArray(val)) {
        val.forEach(item => params.append(key, item));
      } else if (val) {
        params.append(key, val);
      }
    };

    appendMulti('gcp_project_id', filters.gcp_project_id);
    appendMulti('instance_name', filters.instance_name);
    appendMulti('platform', filters.platform);
    appendMulti('scope', filters.scope);
    appendMulti('status', filters.status);
    appendMulti('author', filters.author);
    appendMulti('environment', filters.environment);

    if (filters.search) params.append('search', filters.search);
    
    if (filters.is_shared === true) params.append('is_shared', 'true');
    if (filters.is_shared === false) params.append('is_shared', 'false');

    if (filters.is_available_to_everyone === true) params.append('is_available_to_everyone', 'true');
    if (filters.is_available_to_everyone === false) params.append('is_available_to_everyone', 'false');

    if (filters.uses_rag) params.append('uses_rag', 'true');
    if (filters.uses_mcp) params.append('uses_mcp', 'true');
    if (filters.uses_tools) params.append('uses_tools', 'true');
    if (filters.uses_code) params.append('uses_code', 'true');

    fetch(`/api/agents?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching agents:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAgents();
  }, [selectedCollection, filters]);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  // Export Filtered List to CSV with ALL Columns
  const handleExportCSV = () => {
    if (!agents || agents.length === 0) return;

    // Extract all unique keys across all agent records
    const allKeys = Array.from(
      new Set(agents.flatMap(ag => Object.keys(ag)))
    );

    // Helper to format cell value for CSV
    const formatCell = (val) => {
      if (val === null || val === undefined) return '""';
      if (typeof val === 'boolean') return val ? '"TRUE"' : '"FALSE"';
      if (Array.isArray(val)) return `"${val.join('; ').replace(/"/g, '""')}"`;
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header row
    const headers = allKeys.map(k => `"${k}"`).join(',');

    // Data rows
    const rows = agents.map(ag => {
      return allKeys.map(k => formatCell(ag[k])).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `ge_agent_inventory_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Application Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-google-blue via-google-green to-google-yellow shadow-sm">
              <Bot className="w-7 h-7 text-white font-extrabold" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                Gemini Enterprise Agent Inventory
                <span className="px-2.5 py-0.5 text-xs uppercase font-extrabold tracking-wider rounded-md bg-blue-100 text-google-blue border border-blue-200">
                  Dashboard
                </span>
              </h1>
              <p className="text-xs md:text-sm font-semibold text-slate-500">Enterprise AI Agents, Reasoning Engines & Cloud Run Inventory</p>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200" title={`Logged in as ${user.email}`}>
                <div className="w-8 h-8 rounded-full bg-google-blue text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-xs md:text-sm font-extrabold text-slate-900 block">{user.email}</span>
                  <span className="text-[11px] font-semibold text-slate-500 block">Authorized Admin</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Computational Summary Stats Cards with Clickable Filters & Mouse Hover Tooltips */}
        <HeaderStats stats={stats} filters={filters} setFilters={setFilters} />

        {/* Multi-Dimensional Filter Toolbar */}
        <FilterBar
          collections={collections}
          selectedCollection={selectedCollection}
          setSelectedCollection={setSelectedCollection}
          filterOptions={filterOptions}
          filters={filters}
          setFilters={setFilters}
          onReset={handleResetFilters}
        />

        {/* View Switcher & CSV Export Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Agent Inventory</h2>
            <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs md:text-sm font-bold text-slate-700 shadow-2xs">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} found
            </span>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={agents.length === 0}
              title="Export currently filtered list of agents as CSV file with all columns"
              className="flex items-center gap-2 px-4 py-2.5 bg-google-green hover:bg-green-700 text-white rounded-xl text-xs md:text-sm font-extrabold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export to CSV ({agents.length})
            </button>

            {/* Grid / Table Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                title="Switch to Card Grid View"
                className={`p-2.5 rounded-lg text-xs md:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-google-blue text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Grid className="w-4 h-4" /> Grid
              </button>

              <button
                onClick={() => setViewMode('table')}
                title="Switch to Data Table View"
                className={`p-2.5 rounded-lg text-xs md:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-google-blue text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" /> Table
              </button>
            </div>

          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-10 h-10 animate-spin text-google-blue mb-3" />
            <p className="text-base font-bold">Querying BigQuery Agent Inventory...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="glass-panel p-12 md:p-16 rounded-2xl text-center border border-slate-200 bg-white my-8 shadow-sm">
            <Bot className="w-14 h-14 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-extrabold text-slate-900">No agents match your filter criteria</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 mb-6">Try clearing or adjusting search filters to see all available agents.</p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-3 bg-google-blue hover:bg-blue-700 text-white text-sm font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((ag) => (
              <AgentCard key={ag.agent_id || ag.agent_name} agent={ag} onSelect={setSelectedAgent} />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-extrabold text-xs">
                  <tr>
                    <th className="p-4">Agent Name</th>
                    <th className="p-4">Platform</th>
                    <th className="p-4">Instance / Project</th>
                    <th className="p-4">Sharing Scope</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Author</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  {agents.map((ag) => (
                    <tr
                      key={ag.agent_id || ag.agent_name}
                      onClick={() => setSelectedAgent(ag)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-bold text-slate-900">{ag.agent_name}</td>
                      <td className="p-4">
                        <span 
                          title={`Platform: ${ag.agent_platform}`}
                          className="px-2.5 py-1 rounded-lg bg-blue-100 text-google-blue font-bold border border-blue-200 text-xs"
                        >
                          {(ag.agent_platform || '').replace('Employee-made: ', '')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-semibold">
                        {ag.gemini_enterprise_instance_name && ag.gemini_enterprise_instance_name !== 'N/A'
                          ? ag.gemini_enterprise_instance_name
                          : ag.gcp_project_id}
                      </td>
                      <td className="p-4">
                        <span
                          title={
                            ag.is_available_to_everyone
                              ? "Enterprise: Published enterprise-wide to all users in the organization"
                              : ag.is_shared
                              ? "Restricted: Shared explicitly with a list of specific users"
                              : "Private: Kept private by the author"
                          }
                          className={`font-bold ${
                            ag.is_available_to_everyone
                              ? 'text-google-green'
                              : ag.is_shared
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {ag.access_scope || 'Private'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span 
                          title={
                            (ag.agent_status || '').includes('Enabled')
                              ? "Published (Enabled): Agent is actively published and enabled for interactions"
                              : (ag.agent_status || '').includes('Private')
                              ? "Published (Private): Agent is published by owner but kept private"
                              : "Draft: Agent is in draft status"
                          }
                          className="px-2.5 py-1 rounded-lg bg-green-100 text-google-green font-bold border border-green-200 text-xs"
                        >
                          {ag.agent_status || 'Published'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-semibold">{ag.author_email}</td>
                      <td className="p-4">
                        <button 
                          title="Click to view full agent metadata, permissions & instructions"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-google-blue text-slate-700 hover:text-white rounded-lg border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Slide-over Detail Drawer Modal */}
      <AgentDetailDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

    </div>
  );
}
