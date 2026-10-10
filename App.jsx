
import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowUpRight, BarChart3, BrainCircuit, CheckCircle2,
  ChevronRight, CircleAlert, FileImage, FileSpreadsheet, Gauge, ImagePlus,
  LayoutDashboard, Lightbulb, LoaderCircle, Menu, ScanEye, ShieldCheck, Sparkles,
  UploadCloud, X, Zap
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ScatterChart, Scatter
} from 'recharts';

const API = 'http://127.0.0.1:8000';
const featureLabels = {
  brightness: 'Brightness', saturation: 'Saturation', contrast: 'Contrast',
  colorfulness: 'Colorfulness', text_coverage_estimate: 'Text coverage (estimated)',
  aspect_ratio: 'Aspect ratio'
};

function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}
function percent(value) { return value == null ? '—' : `${fmt(value, 3)}%`; }

export default function App() {
  const [images, setImages] = useState([]);
  const [csv, setCsv] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);

  const imagePreviews = useMemo(() => images.map(file => ({
    file, url: URL.createObjectURL(file), key: `${file.name}-${file.size}`
  })), [images]);

  React.useEffect(() => () => imagePreviews.forEach(item => URL.revokeObjectURL(item.url)), [imagePreviews]);

  function addImages(list) {
    const accepted = Array.from(list || []).filter(file => file.type.startsWith('image/'));
    setImages(prev => {
      const map = new Map([...prev, ...accepted].map(file => [`${file.name}-${file.size}`, file]));
      const unique = Array.from(map.values());
      if (unique.length > 150) {
        setError('Maximum 150 advertisement images per analysis. Remove extra files or analyse them in batches.');
        return unique.slice(0, 150);
      }
      setError('');
      return unique;
    });
  }
  function removeImage(key) { setImages(prev => prev.filter(file => `${file.name}-${file.size}` !== key)); }

  async function analyseImagesOnly() {
    setError('');
    if (!images.length) {
      setError('Please upload at least one advertisement image.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      images.forEach(file => form.append('images', file));
      const response = await fetch(`${API}/api/analyze`, { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Image analysis failed.');
      setResult(body);
      setActiveTab('overview');
    } catch (err) {
      setError(`${err.message}. Confirm the FastAPI backend is running at ${API}.`);
    } finally {
      setLoading(false);
    }
  }

  async function analyse() {
    setError('');
    if (!images.length) return setError('Please upload at least one advertisement image.');
    if (!csv) return setError('Please upload the campaign metrics CSV file.');
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      images.forEach(file => form.append('images', file));
      form.append('metrics_csv', csv);
      const response = await fetch(`${API}/api/analyze`, { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Analysis failed. Please check your files.');
      setResult(body);
      setActiveTab('overview');
    } catch (err) {
      setError(`${err.message}. Confirm the FastAPI backend is running at ${API}.`);
    } finally { setLoading(false); }
  }

  async function analyseBundled() {
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${API}/api/analyze`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Bundled dataset analysis failed.');
      setResult(body);
      setActiveTab('overview');
    } catch (err) {
      setError(`${err.message}. Confirm the FastAPI backend is running at ${API}.`);
    } finally { setLoading(false); }
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'advision-analysis-report.json'; anchor.click();
    URL.revokeObjectURL(url);
  }

  const matched = result?.images?.filter(item => item.matched) || [];
  const chartData = matched.map(item => ({ name: item.image_id, ctr: item.ctr ?? 0, cvr: item.conversion_rate ?? 0 }));
  const corrData = (result?.correlations || []).filter(item => item.metric === 'ctr' && item.rho !== null)
    .map(item => ({ name: featureLabels[item.feature] || item.feature, rho: item.rho, p: item.p_value }))
    .sort((a,b) => Math.abs(b.rho)-Math.abs(a.rho));

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'creatives', label: 'Creative library', icon: FileImage },
    { id: 'insights', label: 'AI insights', icon: BrainCircuit },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20}/></div>
          <div><div className="brand-name">AdVision<span> AI</span></div><div className="brand-caption">CREATIVE INTELLIGENCE</div></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setMobileNav(false); }}>
              <Icon size={18}/><span>{item.label}</span>{item.id === 'insights' && result && <span className="nav-dot"/>}
            </button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="proof-card"><div className="proof-icon"><ShieldCheck size={18}/></div>
            <strong>ProofScore™</strong><p>Insights backed by your campaign data, not guesses.</p>
          </div>
          <div className="user-row"><div className="avatar">AV</div><div><strong>AdVision Workspace</strong><small>Local analysis</small></div><span className="online-dot"/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button>
          <div className="breadcrumb">Workspace <ChevronRight size={14}/> <span>{navItems.find(n => n.id === activeTab)?.label}</span></div>
          <div className="top-actions"><span className="local-status"><span className="online-dot"/> Local analysis</span>
            {result && <button className="button button-secondary button-small" onClick={downloadReport}><ArrowDownToLine size={15}/> Export report</button>}
          </div>
        </header>

        <div className="page-content">
          <section className="hero">
            <div><div className="eyebrow"><span className="eyebrow-dot"/> AD CREATIVE INTELLIGENCE</div>
              <h1>Make every creative<br/><span>count.</span></h1>
              <p>Understand what your ad visuals are doing, connect them to real campaign outcomes, and turn evidence into your next winning test.</p>
              <div className="hero-pills"><span><ScanEye size={14}/> Visual feature extraction</span><span><Activity size={14}/> Performance analytics</span><span><ShieldCheck size={14}/> Proof-first insights</span></div>
            </div>
            <div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/>
              <div className="art-panel panel-back"><div className="mini-label">CREATIVE SIGNAL</div><div className="signal-bars"><i/><i/><i/><i/><i/><i/><i/></div></div>
              <div className="art-panel panel-front"><div className="panel-icon"><BrainCircuit size={20}/></div><div className="mini-label">ANALYSIS ENGINE</div><div className="panel-value">Proof<span>Score</span></div><div className="panel-line"><span/><span/></div><div className="panel-foot"><span className="status-dot"/> Evidence-first intelligence</div></div>
            </div>
          </section>

          {activeTab === 'overview' && <Overview result={result} images={images} csv={csv} previews={imagePreviews}
            dragging={dragging} setDragging={setDragging} addImages={addImages} setCsv={setCsv}
            removeImage={removeImage} analyse={analyse} analyseImagesOnly={analyseImagesOnly} analyseBundled={analyseBundled} loading={loading} error={error}
            chartData={chartData} corrData={corrData} setActiveTab={setActiveTab}/>}
          {activeTab === 'creatives' && <CreativeLibrary previews={imagePreviews} result={result} addImages={addImages} removeImage={removeImage}/>}
          {activeTab === 'insights' && <Insights result={result} corrData={corrData}/>}
          <footer className="footer"><span>AdVision AI <span className="footer-muted">· PS-02 Ad Creative Intelligence</span></span><span>Evidence over assumptions <span className="footer-star">✦</span></span></footer>
        </div>
      </main>
      {mobileNav && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    </div>
  );
}

function Overview({ result, images, csv, previews, dragging, setDragging, addImages, setCsv, removeImage, analyse, analyseImagesOnly, analyseBundled, loading, error, chartData, corrData, setActiveTab }) {
  const summary = result?.summary;
  return <div className="content-grid">
    <section className="section-heading"><div><div className="section-kicker">YOUR WORKSPACE</div><h2>Campaign overview</h2><p>Upload your creatives and metrics to uncover measurable patterns.</p></div>
      <div className="live-badge"><span className="online-dot"/> Analysis ready</div>
    </section>

    <section className="metrics-grid">
      <Metric icon={ImagePlus} label="Images processed" value={summary ? fmt(summary.processed_images,0) : '—'} hint={summary ? `${summary.matched_ads} matched to metrics` : 'Waiting for your upload'} color="violet"/>
      <Metric icon={Gauge} label="Overall CTR" value={summary ? percent(summary.overall_ctr) : '—'} hint="Clicks ÷ impressions" color="blue"/>
      <Metric icon={Zap} label="Conversions" value={summary ? fmt(summary.total_conversions,0) : '—'} hint={summary ? `${fmt(summary.total_clicks,0)} total clicks` : 'From uploaded CSV'} color="amber"/>
      <Metric icon={BarChart3} label="Total impressions" value={summary ? fmt(summary.total_impressions,0) : '—'} hint="Matched campaign rows" color="green"/>
    </section>

    <section className="upload-card">
      <div className="card-heading"><div><div className="section-kicker">STEP 01 / INPUT</div><h3>Bring your creatives</h3><p>Upload ad images and the campaign metrics CSV. Your files are processed by the local backend.</p></div><div className="upload-symbol"><UploadCloud size={21}/></div></div>
      <div className="upload-columns">
        <div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={e => {e.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)}
          onDrop={e => {e.preventDefault();setDragging(false);addImages(e.dataTransfer.files);}}>
          <input id="image-input" type="file" accept="image/png,image/jpeg,image/webp,image/bmp" multiple onChange={e => addImages(e.target.files)}/>
          <label htmlFor="image-input" className="drop-content"><div className="drop-icon"><FileImage size={24}/></div><strong>Drop your ad creatives here</strong><span>or <u>browse files</u></span><small>PNG, JPG, WEBP, BMP · Max 150 images · 12 MB each</small></label>
        </div>
        <div className={`csv-drop ${csv ? 'file-selected' : ''}`}>
          <input id="csv-input" type="file" accept=".csv,text/csv" onChange={e => setCsv(e.target.files?.[0] || null)}/>
          <label htmlFor="csv-input" className="csv-content"><div className="csv-icon"><FileSpreadsheet size={22}/></div><div><strong>{csv ? csv.name : 'Campaign metrics CSV'}</strong><span>{csv ? `${(csv.size/1024).toFixed(1)} KB · selected` : 'image_id, impressions, clicks, conversions'}</span></div><span className="choose-file">{csv ? 'Change' : 'Choose file'}</span></label>
          <div className="csv-note"><CheckCircle2 size={14}/> Optional: spend, revenue, campaign, data_source, metrics_verified</div><p className="csv-note">Use metrics_verified=true only when checked against the original campaign export. Synthetic/demo data must be disclosed.</p>
        </div>
      </div>
      {previews.length > 0 && <div className="selected-files"><div className="selected-title"><span>Selected creatives <b>{previews.length}</b></span><button className="text-button" onClick={() => previews.forEach(p => removeImage(`${p.file.name}-${p.file.size}`))}>Clear all</button></div>
        <div className="preview-strip">{previews.map(item => <div className="preview-item" key={item.key}><img src={item.url} alt={item.file.name}/><div><strong title={item.file.name}>{item.file.name}</strong><small>{(item.file.size/1024).toFixed(0)} KB</small></div><button className="remove-file" onClick={() => removeImage(item.key)} aria-label={`Remove ${item.file.name}`}><X size={14}/></button></div>)}</div>
      </div>}
      {error && <div className="error-banner"><CircleAlert size={17}/><span>{error}</span></div>}
      <div className="upload-footer"><div className="privacy-note"><ShieldCheck size={16}/><span>Local processing · Your uploads are not saved to a database</span></div>
        <div className="analysis-actions">
          <button className="button button-primary" onClick={analyseImagesOnly} disabled={loading || images.length === 0}>
            {loading ? <><LoaderCircle className="spin" size={17}/> Analysing…</> : <><ScanEye size={17}/> 1. Image Analysis <ArrowUpRight size={16}/></>}
          </button>
          <button className="button button-secondary" onClick={analyse} disabled={loading || images.length === 0 || !csv}>
            {loading ? 'Please wait…' : <><BarChart3 size={17}/> 2. Campaign Performance</>}
          </button>
          <button className="button button-secondary" onClick={analyseBundled} disabled={loading}>
            {loading ? 'Please wait…' : <><FileSpreadsheet size={17}/> Analyse supplied Srishti dataset</>}
          </button>
        </div>
      </div>
    </section>

    {result ? <>
      <section className="section-heading results-heading"><div><div className="section-kicker">STEP 02 / RESULTS</div><h2>Your creative intelligence</h2><p>{result.analysis_mode === 'image_only'
        ? 'Visual measurements and heuristic design suggestions from uploaded images. Campaign KPIs are not inferred.'
        : 'Computed from uploaded image pixels and matched campaign metrics.'}</p></div><button className="button button-secondary button-small" onClick={() => setActiveTab('insights')}>View all insights <ChevronRight size={15}/></button></section>
      <section className="charts-grid">
        <div className="chart-card"><div className="chart-title"><div><h3>Creative performance</h3><p>Click-through rate by matched ad</p></div><span className="chart-tag">CTR %</span></div>
          {chartData.length ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:10,right:8,left:-22,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#202a40" vertical={false}/><XAxis dataKey="name" stroke="#73809a" tick={{fontSize:11}}/><YAxis stroke="#73809a" tick={{fontSize:11}}/><Tooltip contentStyle={{background:'#111a2d',border:'1px solid #293651',borderRadius:10,color:'#fff'}}/><Bar dataKey="ctr" name="CTR %" radius={[5,5,0,0]}>{chartData.map((entry,index)=><Cell key={entry.name} fill={['#9c7cff','#6d8dff','#38d9c4','#ffbd66'][index%4]}/>)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyChart text="No matched metrics yet"/>}
        </div>
        <div className="chart-card"><div className="chart-title"><div><h3>Visual signals vs CTR</h3><p>Spearman rank correlation</p></div><span className="chart-tag">ρ</span></div>
          {corrData.length ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={corrData} layout="vertical" margin={{top:0,right:14,left:22,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#202a40" horizontal={false}/><XAxis type="number" domain={[-1,1]} stroke="#73809a" tick={{fontSize:10}}/><YAxis dataKey="name" type="category" width={112} stroke="#73809a" tick={{fontSize:10}}/><Tooltip contentStyle={{background:'#111a2d',border:'1px solid #293651',borderRadius:10,color:'#fff'}} formatter={v=>[fmt(v,3),'Spearman ρ']}/><Bar dataKey="rho" name="Spearman ρ" radius={[0,4,4,0]}>{corrData.map((entry,index)=><Cell key={entry.name} fill={Math.abs(entry.rho)>=.6?'#38d9c4':Math.abs(entry.rho)>=.3?'#9c7cff':'#6d8dff'}/>)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyChart text="Need more matched ads with varied metrics"/>}
        </div>
      </section>
      <section className="insight-preview"><div className="insight-preview-heading"><div className="insight-icon"><Lightbulb size={19}/></div><div><h3>Recommended next steps</h3><p>Evidence-based actions from this analysis</p></div><button className="text-button" onClick={() => setActiveTab('insights')}>See all <ChevronRight size={14}/></button></div>
        <div className="recommendation-list">{result.recommendations.map((rec,i)=><Recommendation rec={rec} key={i}/>)}</div>
      </section>
      <section className="data-table-card"><div className="chart-title"><div><h3>Creative breakdown</h3><p>Visual measurements and matched outcomes</p></div><span className="chart-tag">{result.images.length} images</span></div><div className="table-wrap"><table><thead><tr><th>Creative</th><th>Brightness</th><th>Colorfulness</th><th>Text est.</th><th>Impressions</th><th>CTR</th><th>CVR</th><th>Match</th></tr></thead><tbody>{result.images.map(item=><tr key={item.filename}><td><div className="table-name"><span className="table-file"><FileImage size={15}/></span><span>{item.filename}</span></div></td><td>{fmt(item.brightness)}</td><td>{fmt(item.colorfulness)}</td><td>{fmt(item.text_coverage_estimate)}%</td><td>{fmt(item.impressions,0)}</td><td>{percent(item.ctr)}</td><td>{percent(item.conversion_rate)}</td><td><span className={`match-pill ${item.matched?'match-yes':'match-no'}`}>{item.matched?'Matched':'No match'}</span></td></tr>)}</tbody></table></div></section>
      <Methodology items={result.methodology}/>
    </> : <EmptyState/>}
  </div>;
}

function Metric({icon:Icon,label,value,hint,color}) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}><Icon size={19}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div></div>;
}
function EmptyState() {
  return <section className="empty-state"><div className="empty-illustration"><div className="empty-ring ring-a"/><div className="empty-ring ring-b"/><div className="empty-main-icon"><BrainCircuit size={29}/></div><div className="floating-icon float-a"><ImagePlus size={17}/></div><div className="floating-icon float-b"><BarChart3 size={17}/></div></div><div className="section-kicker">READY WHEN YOU ARE</div><h3>Your next creative insight starts here.</h3><p>Upload real ad creatives and their campaign metrics to see visual signals, performance correlations, and evidence-based next steps.</p><div className="empty-tags"><span><CheckCircle2 size={14}/> Pixel-based features</span><span><CheckCircle2 size={14}/> Real CSV metrics</span><span><CheckCircle2 size={14}/> No fabricated findings</span></div></section>;
}
function EmptyChart({text}) { return <div className="empty-chart"><BarChart3 size={25}/><span>{text}</span></div>; }
function Recommendation({rec}) {
  const priority = (rec.priority || 'Medium').toLowerCase();
  return <div className="recommendation"><div className="recommendation-bullet"><Lightbulb size={17}/></div><div className="recommendation-body"><div className="recommendation-top"><strong>{rec.title}</strong><span className={`priority priority-${priority}`}>{rec.priority}</span></div><p>{rec.reason}</p><div className="recommendation-action"><b>Action</b> {rec.action}</div></div></div>;
}
function Methodology({items}) {
  return <details className="methodology"><summary><ShieldCheck size={16}/> Methodology & limitations</summary><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul></details>;
}
function CreativeLibrary({previews,result,addImages,removeImage}) {
  const results = result?.images || [];
  return <div className="content-grid">
    <section className="section-heading"><div><div className="section-kicker">ASSET MANAGEMENT</div><h2>Creative library</h2><p>Review uploaded images and their extracted visual measurements.</p></div><label className="button button-primary upload-more"><ImagePlus size={16}/> Add creatives<input type="file" accept="image/*" multiple onChange={e=>addImages(e.target.files)}/></label></section>
    {previews.length ? <div className="library-grid">{previews.map(item=>{const data=results.find(r=>r.filename===item.file.name);return <div className="library-card" key={item.key}><div className="library-image"><img src={item.url} alt={item.file.name}/><span className="image-badge">{data?.matched?'Analysed':'Uploaded'}</span></div><div className="library-info"><strong title={item.file.name}>{item.file.name}</strong><span>{(item.file.size/1024).toFixed(0)} KB</span>{data&&<div className="library-stats"><span>Brightness <b>{fmt(data.brightness)}</b></span><span>Colorfulness <b>{fmt(data.colorfulness)}</b></span><span>CTR <b>{percent(data.ctr)}</b></span></div>}<button className="text-button remove-library" onClick={()=>removeImage(item.key)}><X size={14}/> Remove</button></div></div>})}</div> : <div className="empty-state"><div className="empty-main-icon"><FileImage size={28}/></div><h3>No creatives uploaded yet</h3><p>Go to Overview and upload your ad images to get started.</p></div>}
  </div>;
}
function Insights({result,corrData}) {
  if (!result) return <div className="content-grid"><section className="section-heading"><div><div className="section-kicker">ANALYSIS CENTER</div><h2>AI insights</h2><p>Insights appear after you analyse your uploaded creatives.</p></div></section><EmptyState/></div>;
  return <div className="content-grid">
    <section className="section-heading"><div><div className="section-kicker">ANALYSIS CENTER</div><h2>AI insights & ProofScore</h2><p>Findings calculated from your uploaded images and campaign metrics.</p></div><span className="live-badge"><ShieldCheck size={14}/> Evidence-first</span></section>
    <section className="metrics-grid"><Metric icon={CheckCircle2} label="Matched ads" value={fmt(result.summary.matched_ads,0)} hint="Image-to-CSV matches" color="green"/><Metric icon={Activity} label="Features measured" value="6" hint="Computed from image pixels" color="violet"/><Metric icon={Gauge} label="Overall CVR" value={percent(result.summary.overall_conversion_rate)} hint="Conversions ÷ clicks" color="blue"/><Metric icon={Zap} label="Overall CPA" value={result.summary.overall_cpa == null?'—':fmt(result.summary.overall_cpa)} hint="Spend ÷ conversions" color="amber"/></section>
    <section className="insight-preview"><div className="insight-preview-heading"><div className="insight-icon"><Lightbulb size={19}/></div><div><h3>Recommended next steps</h3><p>Recommendations generated from current analysis results</p></div></div><div className="recommendation-list">{result.recommendations.map((rec,i)=><Recommendation rec={rec} key={i}/>)}</div></section>
    <section className="data-table-card"><div className="chart-title"><div><h3>Feature correlation report</h3><p>Spearman rank correlation between image features and metrics</p></div></div><div className="table-wrap"><table><thead><tr><th>Visual feature</th><th>Metric</th><th>Spearman ρ</th><th>p-value</th><th>n</th><th>Interpretation</th></tr></thead><tbody>{result.correlations.map((c,i)=><tr key={i}><td>{featureLabels[c.feature]||c.feature}</td><td>{c.metric==='ctr'?'CTR':'Conversion rate'}</td><td>{c.rho==null?'—':fmt(c.rho,3)}</td><td>{c.p_value==null?'—':fmt(c.p_value,4)}</td><td>{c.sample_size}</td><td><span className={`match-pill ${c.status==='association_detected'?'match-yes':c.status==='insufficient_data'?'match-no':'match-neutral'}`}>{c.status.replaceAll('_',' ')}</span><div className="interpretation">{c.interpretation}</div></td></tr>)}</tbody></table></div></section>
    <section className="method-card"><div className="method-icon"><ShieldCheck size={20}/></div><div><h3>ProofScore principles</h3><p>We do not label a design feature as a guaranteed winner. Association is not causation; campaign targeting, audience, placement, budget, and timing can influence outcomes. Use controlled A/B tests to validate a creative change.</p></div></section>
    <Methodology items={result.methodology}/>
  </div>;
}
