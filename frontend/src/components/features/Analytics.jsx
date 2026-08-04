import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { X, HardDrive, File as FileIcon, AlertTriangle, Clock, Folder } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Analytics = ({ onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`${API_URL}/api/analytics`);
                const json = await res.json();
                if (json.success) setData(json);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-white text-xl animate-pulse">Loading Analytics...</div>
        </div>
    );

    if (!data) return null;

    const { analytics, recommendations } = data;
    
    const pieData = Object.keys(analytics.categories).map(key => ({
        name: key,
        value: analytics.categories[key]
    }));

    const availableStorage = analytics.capacity - analytics.totalSize;
    const usedPercentage = Math.min(100, (analytics.totalSize / analytics.capacity) * 100).toFixed(1);

    // Prepare data for Largest Files Bar Chart
    const largestFilesData = (analytics.largestFiles || []).map(f => ({
        name: f.name.length > 15 ? f.name.substring(0, 15) + '...' : f.name,
        fullName: f.name,
        size: f.size,
        formattedSize: formatBytes(f.size)
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{payload[0].payload.fullName}</p>
                    <p style={{ color: 'var(--accent-primary)', margin: 0 }}>{payload[0].payload.formattedSize}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="hide-scrollbar modal-box analytics-modal" onClick={(e) => e.stopPropagation()} style={{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 10 }}>
                    <X size={24} />
                </button>
                
              <div style={{ padding: 'clamp(1rem, 5vw, 2rem)' }}>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'Outfit' }}>
                        <HardDrive color="var(--accent-primary)" /> Storage Analytics
                    </h2>

                    {/* Top Level Storage Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Used Storage</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{formatBytes(analytics.totalSize)}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Total space currently used</div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Available Storage</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Unlimited</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>No storage limits</div>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Files</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{analytics.totalFiles}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Across all categories</div>
                        </div>
                    </div>

                    {/* Charts Row */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>                        
                        {/* Storage by Category */}
                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Storage by Category</h3>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatBytes(value)} contentStyle={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-primary)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Largest Files Chart */}
                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Largest Files</h3>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={largestFilesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatBytes(value, 0)} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="size" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Lists Row */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>                        
                        {/* Largest Folders */}
                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Folder size={20} className="text-secondary" /> Largest Folders
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {analytics.largestFolders && analytics.largestFolders.map((folder, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                        <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Folder size={16} color="var(--accent-primary)" /> {folder.name}
                                        </span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{formatBytes(folder.size)}</span>
                                    </div>
                                ))}
                                {(!analytics.largestFolders || analytics.largestFolders.length === 0) && (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No folder data available.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Uploads */}
                        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={20} className="text-secondary" /> Recent Uploads
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {analytics.recentUploads && analytics.recentUploads.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <FileIcon size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} /> {file.name}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{formatDate(file.date)}</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{formatBytes(file.size)}</span>
                                    </div>
                                ))}
                                {(!analytics.recentUploads || analytics.recentUploads.length === 0) && (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No recent uploads.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Recommendations */}
                    <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>AI Insights & Recommendations</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--accent-glow)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <AlertTriangle color="var(--accent-primary)" style={{ marginTop: '0.25rem' }} size={20} />
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Duplicate Files</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>You have {recommendations.duplicates} sets of identical files taking up space.</div>
                                </div>
                            </div>
                            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--accent-glow)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <FileIcon color="var(--accent-primary)" style={{ marginTop: '0.25rem' }} size={20} />
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Large Files</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{recommendations.largeFiles} files are larger than 50MB. Consider compressing videos.</div>
                                </div>
                            </div>
                            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--accent-glow)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <Clock color="var(--accent-primary)" style={{ marginTop: '0.25rem' }} size={20} />
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Old Files</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{recommendations.oldFiles} files haven't been touched in over 6 months.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Analytics;
