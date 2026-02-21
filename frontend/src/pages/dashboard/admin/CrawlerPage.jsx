import React, { useState, useContext, useEffect } from 'react';
import AuthContext from '../../../providers/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaPlus, FaRobot, FaList, FaGlobe, FaPlay } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function CrawlerPage() {
    const { userData } = useContext(AuthContext);
    const navigate = useNavigate();

    // Mode: 'single' or 'bulk'
    const [mode, setMode] = useState('single');

    // Single Crawl State
    const [targetSite, setTargetSite] = useState('Codeforces');
    const [customUrl, setCustomUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [drafts, setDrafts] = useState([]);

    // Bulk Crawl State
    const [sources, setSources] = useState([]);
    const [newSourceUrl, setNewSourceUrl] = useState('');
    const [newSourceName, setNewSourceName] = useState('');
    const [bulkLimit, setBulkLimit] = useState(2);
    const [bulkResults, setBulkResults] = useState(null);

    // Multi-select State
    const [selectedDrafts, setSelectedDrafts] = useState(new Set());

    // Initial Data Fetch
    useEffect(() => {
        const userId = userData?.id || userData?.user_id;
        if (userId) {
            fetchDrafts(userId);
            fetchSources(userId);
        }
    }, [userData]);

    const fetchDrafts = async (userId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/crawler/drafts/${userId}`);
            const data = await response.json();
            if (data.success) {
                setDrafts(data.events || []);
                setSelectedDrafts(new Set()); // Clear selection on refresh
            }
        } catch (err) {
            console.error("Failed to fetch drafts:", err);
        }
    };

    const handleBulkPublish = async () => {
        if (!window.confirm(`Publish ${selectedDrafts.size} events?`)) return;
        setLoading(true);
        const toastId = toast.loading("Publishing events...");

        try {
            const promises = Array.from(selectedDrafts).map(id => {
                const draft = drafts.find(d => d.id === id);
                if (!draft) return Promise.resolve();

                const payload = {
                    ...draft,
                    status: 'active',
                };

                return fetch(`http://localhost:5000/api/events/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            });

            await Promise.all(promises);
            toast.success("Events published!", { id: toastId });

            // Refresh
            const userId = userData?.id || userData?.user_id;
            if (userId) fetchDrafts(userId);

        } catch (err) {
            console.error(err);
            toast.error("Failed to publish selected", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedDrafts.size} drafts?`)) return;
        setLoading(true);
        const toastId = toast.loading("Deleting drafts...");

        try {
            const promises = Array.from(selectedDrafts).map(id =>
                fetch(`http://localhost:5000/api/events/${id}`, {
                    method: 'DELETE'
                })
            );

            await Promise.all(promises);
            toast.success("Drafts deleted!", { id: toastId });

            // Refresh
            const userId = userData?.id || userData?.user_id;
            if (userId) fetchDrafts(userId);

        } catch (err) {
            console.error(err);
            toast.error("Failed to delete selected", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const fetchSources = async (userId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/crawler/sources/${userId}`);
            const data = await response.json();
            if (data.success) setSources(data.sources || []);
        } catch (err) {
            console.error("Failed to fetch sources:", err);
        }
    };

    const handleSingleCrawl = async () => {
        let url = '';
        if (targetSite === 'Codeforces') url = 'https://codeforces.com/contests';
        if (targetSite === 'Toph') url = 'https://toph.co/contests';
        if (targetSite === 'Custom') url = customUrl;

        if (!url) {
            setError("Please enter a valid URL.");
            return;
        }

        const userId = userData?.id || userData?.user_id;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('http://localhost:5000/api/crawler/crawl-and-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, user_id: userId }),
            });
            const data = await response.json();
            if (data.success) {
                setResult(data);
                fetchDrafts(userId);
                toast.success(data.message);
            } else {
                setError(data.error || 'Crawling failed.');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkCrawl = async () => {
        const userId = userData?.id || userData?.user_id;
        setLoading(true);
        setBulkResults(null);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/crawler/bulk-crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, limit: bulkLimit }),
            });
            const data = await response.json();
            if (data.success) {
                setBulkResults(data.results);
                fetchDrafts(userId);
                toast.success(data.message);
            } else {
                setError(data.error || 'Bulk crawl failed.');
            }
        } catch (err) {
            setError('Bulk error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSource = async (e) => {
        e.preventDefault();
        const userId = userData?.id || userData?.user_id;
        if (!newSourceUrl) return;

        try {
            const response = await fetch('http://localhost:5000/api/crawler/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newSourceUrl, name: newSourceName, user_id: userId }),
            });
            const data = await response.json();
            if (data.success) {
                setSources([data.source, ...sources]);
                setNewSourceUrl('');
                setNewSourceName('');
                toast.success("Source added!");
            } else {
                toast.error(data.error || "Failed to add source");
            }
        } catch (err) {
            toast.error("Error adding source");
        }
    };

    const handleDeleteSource = async (id) => {
        if (!window.confirm("Delete this source?")) return;
        try {
            const response = await fetch(`http://localhost:5000/api/crawler/sources/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setSources(sources.filter(s => s.id !== id));
                toast.success("Source deleted");
            }
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <FaRobot className="text-blue-600" />
                Event Crawler & Miner
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
                <button
                    onClick={() => setMode('single')}
                    className={`pb-3 px-4 font-semibold ${mode === 'single' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                >
                    Single Site Crawl
                </button>
                <button
                    onClick={() => setMode('bulk')}
                    className={`pb-3 px-4 font-semibold ${mode === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                >
                    Bulk Mining (Saved Sources)
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {mode === 'single' ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl">
                    <p className="text-gray-600 mb-6">
                        Crawl a specific website once to find events immediately.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Website</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={targetSite}
                                onChange={(e) => setTargetSite(e.target.value)}
                            >
                                <option value="Codeforces">Codeforces</option>
                                <option value="Toph">Toph.co</option>
                                <option value="Custom">Custom URL</option>
                            </select>
                        </div>

                        {targetSite === 'Custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2.5"
                                    placeholder="https://example.com/events"
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleSingleCrawl}
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all 
                            ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'}`}
                        >
                            {loading ? 'Crawling...' : '🚀 Start Mining'}
                        </button>
                    </div>

                    {result && (
                        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h3 className="font-bold text-green-800">✅ Success!</h3>
                            <p className="text-green-700">{result.message}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Col: Source Management */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <FaList className="text-gray-600" /> Managed Sources
                            </h2>

                            {/* Add Source Form */}
                            <form onSubmit={handleAddSource} className="flex gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Source URL (e.g. https://codeforces.com/contests)"
                                        className="w-full border rounded px-3 py-2"
                                        value={newSourceUrl}
                                        onChange={e => setNewSourceUrl(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="w-1/3">
                                    <input
                                        type="text"
                                        placeholder="Name (Optional)"
                                        className="w-full border rounded px-3 py-2"
                                        value={newSourceName}
                                        onChange={e => setNewSourceName(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-1">
                                    <FaPlus /> Add
                                </button>
                            </form>

                            {/* Sources List */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sources.length === 0 ? (
                                    <p className="text-gray-500 italic text-center py-4">No sources saved yet.</p>
                                ) : (
                                    sources.map(source => (
                                        <div key={source.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border border-gray-100">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="bg-blue-100 p-2 rounded text-blue-600">
                                                    <FaGlobe />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{source.name || 'Untitled Source'}</p>
                                                    <p className="text-sm text-gray-500 truncate">{source.url}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSource(source.id)}
                                                className="text-red-400 hover:text-red-600 p-2"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Bulk Run Results */}
                        {bulkResults && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-lg mb-4">Batch Results</h3>
                                <div className="space-y-3">
                                    {bulkResults.map((res, idx) => (
                                        <div key={idx} className={`p-3 rounded border ${res.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                            <div className="flex justify-between">
                                                <span className="font-medium truncate w-2/3">{res.url}</span>
                                                {res.error ? (
                                                    <span className="text-red-600 font-bold">Failed</span>
                                                ) : (
                                                    <span className="text-green-700 font-bold">{res.saved} saved</span>
                                                )}
                                            </div>
                                            {res.error && <p className="text-sm text-red-600 mt-1">{res.error}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Col: Run Controls */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <FaPlay className="text-yellow-400" /> Start Mining
                            </h2>
                            <p className="text-slate-300 text-sm mb-6">
                                This will crawl all valid sources listed on the left.
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Events limit per source
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={bulkLimit}
                                    onChange={e => setBulkLimit(parseInt(e.target.value) || 2)}
                                />
                            </div>

                            <button
                                onClick={handleBulkCrawl}
                                disabled={loading || sources.length === 0}
                                className={`w-full py-3 px-4 rounded-lg font-bold text-slate-900 transition-all
                                ${loading || sources.length === 0 ? 'bg-slate-600 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-300 shadow-lg'}`}
                            >
                                {loading ? 'Mining in progress...' : 'Start Batch Mining'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SHARED: Pending Drafts Section */}
            {(drafts.length > 0) && (
                <div className="mt-10 border-t pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-base">
                                <FaList />
                            </span>
                            Pending Drafts <span className="text-gray-400 text-sm font-normal">({drafts.length})</span>
                        </h2>

                        <div className="flex items-center gap-3">
                            {selectedDrafts.size > 0 ? (
                                <>
                                    <span className="text-sm font-medium text-gray-600">{selectedDrafts.size} selected</span>
                                    <button
                                        onClick={handleBulkPublish}
                                        disabled={loading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
                                    >
                                        Publish Selected
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={loading}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors cursor-pointer"
                                    >
                                        Delete Selected
                                    </button>
                                    <button
                                        onClick={() => setSelectedDrafts(new Set())}
                                        className="text-gray-500 hover:text-gray-700 text-sm underline cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setSelectedDrafts(new Set(drafts.map(d => d.id)))}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
                                >
                                    Select All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drafts.map((event) => {
                            const isSelected = selectedDrafts.has(event.id);
                            return (
                                <div
                                    key={event.id}
                                    className={`relative bg-white p-4 rounded-xl border transition-all group overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                                >
                                    {/* Checkbox Overlay */}
                                    <div className="absolute top-3 left-3 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                                const newSet = new Set(selectedDrafts);
                                                if (newSet.has(event.id)) newSet.delete(event.id);
                                                else newSet.add(event.id);
                                                setSelectedDrafts(newSet);
                                            }}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Card Content - Click to Edit (but avoid checkbox click) */}
                                    <div onClick={(e) => {
                                        // Only navigate if not clicking the checkbox area (though checkbox is absolute on top, let's be safe)
                                        if (e.target.type !== 'checkbox') {
                                            navigate(`/dashboard/organizer/events/edit/${event.id}`);
                                        }
                                    }} className="pl-8 cursor-pointer">
                                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-bold">Edit</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 mb-1 group-hover:text-blue-700 line-clamp-1">{event.title}</h3>
                                        <div className="text-sm text-gray-500 flex flex-col gap-1">
                                            <span className="flex items-center gap-1">
                                                <FaGlobe size={12} />
                                                {event.venue_name || event.additional_info?.platform || 'Web'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                Crawled: {new Date(event.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
