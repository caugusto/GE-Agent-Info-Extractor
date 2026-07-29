import React, { useState, useEffect } from 'react';
import HeaderStats from './components/HeaderStats';
import FilterBar from './components/FilterBar';
import AgentCard from './components/AgentCard';
import AgentDetailDrawer from './components/AgentDetailDrawer';
import { Bot, Grid, List, RefreshCw, ShieldCheck, User, Sparkles } from 'lucide-react';

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

  // Default Filters
  const initialFilters = {
    gcp_project_id: '',
    instance_name: '',
    platform: '',
    scope: '',
    status: '',
    author: '',
    environment: '',
    search: '',
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

  // Fetch Filter Options & Stats whenever selectedCollection changes
  useEffect(() => {
    const colParam = selectedCollection ? `?collection_id=${selectedCollection}` : '';
    
    // Fetch Filter Options
    fetch(`/api/filter_options${colParam}`)
      .then(res => res.json())
      .then(data => setFilterOptions(data))
      .catch(err => console.error('Error fetching filter options:', err));

    // Fetch Stats
    fetch(`/api/stats${colParam}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, [selectedCollection]);

  // Fetch Agents whenever filters or selectedCollection change
  const fetchAgents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    
    if (selectedCollection) params.append('collection_id', selectedCollection);
    if (filters.gcp_project_id) params.append('gcp_project_id', filters.gcp_project_id);
    if (filters.instance_name) params.append('instance_name', filters.instance_name);
    if (filters.platform) params.append('platform', filters.platform);
    if (filters.scope) params.append('scope', filters.scope);
    if (filters.status) params.append('status', filters.status);
    if (filters.author) params.append('author', filters.author);
    if (filters.environment) params.append('environment', filters.environment);
    if (filters.search) params.append('search', filters.search);
    
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

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col">
      
      {/* Top Application Navbar */}
      <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-google-blue via-google-green to-google-yellow">
              <Bot className="w-6 h-6 text-black font-bold" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Gemini Enterprise Agent Inventory
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-google-blue/20 text-google-blue border border-google-blue/30">
                  Dashboard
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Enterprise AI Agents, Reasoning Engines & Cloud Run Inventory</p>
            </div>
          </div>

          {/* User Profile & Security Badge */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-google-green/10 border border-google-green/30 text-google-green text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Direct Cloud Run IAP Protected</span>
            </div>

            {user && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-dark-card border border-dark-border">
                <div className="w-7 h-7 rounded-full bg-google-blue/20 text-google-blue flex items-center justify-center font-bold text-xs">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-xs font-semibold text-white block">{user.email}</span>
                  <span className="text-[10px] text-slate-400 block">Authorized Access</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Computational Summary Stats Cards */}
        <HeaderStats stats={stats} />

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

        {/* View Switcher Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Agent Inventory</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-dark-card border border-dark-border text-xs font-mono text-slate-300">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} found
            </span>
          </div>

          <div className="flex items-center gap-2 bg-dark-card p-1 rounded-xl border border-dark-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-google-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-4 h-4" /> Grid
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-google-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" /> Table
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-google-blue mb-3" />
            <p className="text-sm font-medium">Querying BigQuery Agent Inventory...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center border border-dark-border my-8">
            <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No agents match your filter criteria</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Try clearing or adjusting search filters to see all available agents.</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-google-blue hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((ag) => (
              <AgentCard key={ag.agent_id || ag.agent_name} agent={ag} onSelect={setSelectedAgent} />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="glass-panel rounded-2xl overflow-hidden border border-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-card border-b border-dark-border text-slate-400 uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-dark-border/50 text-slate-200">
                  {agents.map((ag) => (
                    <tr
                      key={ag.agent_id || ag.agent_name}
                      onClick={() => setSelectedAgent(ag)}
                      className="hover:bg-dark-hover/80 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-bold text-white">{ag.agent_name}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-google-blue/10 text-google-blue font-medium border border-google-blue/20">
                          {(ag.agent_platform || '').replace('Employee-made: ', '')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {ag.gemini_enterprise_instance_name && ag.gemini_enterprise_instance_name !== 'N/A'
                          ? ag.gemini_enterprise_instance_name
                          : ag.gcp_project_id}
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-semibold ${
                            ag.is_available_to_everyone
                              ? 'text-google-green'
                              : ag.is_shared
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {ag.access_scope || 'Private'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-google-green/10 text-google-green font-medium border border-google-green/20">
                          {ag.agent_status || 'Published'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{ag.author_email}</td>
                      <td className="p-4">
                        <button className="px-2.5 py-1 bg-dark-card hover:bg-google-blue text-slate-300 hover:text-white rounded-lg border border-dark-border text-[11px] font-semibold transition-all">
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
