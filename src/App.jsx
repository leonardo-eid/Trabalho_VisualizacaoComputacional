import React, {useEffect, useMemo, useState} from 'react';
import Plot from 'react-plotly.js';

const GROUPS = ['Alunos','Docentes','Servidores'];
const RACE_COLORS = {
  'Amarela':'#e6b84b','Branca':'#d8e2eb','Indígena':'#8b6db0',
  'Parda':'#d28a55','Preta':'#b84c58','Não informada':'#71869a'
};
const HIST_GROUPS = ['Alunos de graduação','Alunos de pós-graduação','Docentes','Servidores técnicos-administrativos'];
const fmt = n => n == null ? '—' : new Intl.NumberFormat('pt-BR').format(n);
const sum = arr => arr.reduce((a,b)=>a+(Number(b)||0),0);
const pctOf = (n,d) => d ? n/d*100 : null;
const layoutBase = {
  autosize:true, paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
  font:{family:'Inter, Arial, sans-serif',color:'#d7e1ea',size:12},
  margin:{l:65,r:28,t:24,b:62}, hoverlabel:{bgcolor:'#142638',font:{color:'#fff'}},
  xaxis:{gridcolor:'#26394b',zerolinecolor:'#60758a'},
  yaxis:{gridcolor:'#26394b',zerolinecolor:'#60758a'}
};
const cfg = {responsive:true,displaylogo:false,scrollZoom:true,modeBarButtonsToAdd:['select2d','lasso2d']};

function Panel({title,sub,children}) {return <section className="panel"><div className="panel-head"><div><h2>{title}</h2><p>{sub}</p></div></div>{children}</section>}
function Empty({children}) {return <div className="empty">{children}</div>}
function Field({label,children}) {return <label className="field"><span>{label}</span>{children}</label>}

export default function App(){
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [tab,setTab]=useState('historico');
 const [historicMode,setHistoricMode]=useState('absoluto');
 const [yearStart,setYearStart]=useState(1989);
 const [yearEnd,setYearEnd]=useState(2025);
 const [heatGroup,setHeatGroup]=useState('Alunos');
 const [unitType,setUnitType]=useState('A - Ensino e Pesquisa');
 const [rankGroup,setRankGroup]=useState('Alunos');
 const [rankRace,setRankRace]=useState('Preta');
 const [selectedUnit,setSelectedUnit]=useState('');
 const [growthY,setGrowthY]=useState('Docentes');
 const [growthLabels,setGrowthLabels]=useState(false);

 useEffect(()=>{
   fetch('/data/usp.json').then(r=>{if(!r.ok)throw new Error('Não foi possível carregar os dados.');return r.json()}).then(setData).catch(e=>setError(e.message));
 },[]);

 const dem=data?.demografia||[];
 const hist=data?.historico||[];
 const evo=data?.evolucaoUnidade||[];
 const races=data?.racas||[];
 const unitTypes=useMemo(()=>[...new Set(dem.map(d=>d.tipoUnidade))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[dem]);
 const units=useMemo(()=>[...new Set(dem.filter(d=>d.tipoUnidade===unitType).map(d=>d.unidade))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[dem,unitType]);
 useEffect(()=>{if(selectedUnit && !units.includes(selectedUnit))setSelectedUnit('')},[units,selectedUnit]);

 // Série histórica: os dados desta seção foram transcritos visualmente das imagens originais.
 const historical=useMemo(()=>HIST_GROUPS.map(g=>{
   const all=hist.filter(d=>d.grupo===g&&d.total!=null).sort((a,b)=>a.ano-b.ano);
   const base=all[0]?.total;
   const rows=all.filter(d=>d.ano>=yearStart&&d.ano<=yearEnd);
   return {name:g,x:rows.map(d=>d.ano),y:rows.map(d=>historicMode==='indice'&&base?d.total/base*100:d.total)};
 }),[hist,yearStart,yearEnd,historicMode]);

 // Heatmap: percentual da raça dentro do total da população de cada unidade.
 const heat=useMemo(()=>{
   const rows=dem.filter(d=>d.grupo===heatGroup&&d.tipoUnidade===unitType);
   let us=[...new Set(rows.map(d=>d.unidade))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
   if(selectedUnit && us.includes(selectedUnit)) us=[selectedUnit,...us.filter(u=>u!==selectedUnit)];
   const z=races.map(r=>us.map(u=>{
     const ur=rows.filter(d=>d.unidade===u);
     const denominator=sum(ur.map(d=>d.total));
     const numerator=sum(ur.filter(d=>d.raca===r).map(d=>d.total));
     return pctOf(numerator,denominator);
   }));
   return {us,z};
 },[dem,heatGroup,unitType,selectedUnit,races]);

 // Ranking: a participação é calculada dentro de cada unidade e população selecionada.
 const ranking=useMemo(()=>{
   const rows=dem.filter(d=>d.grupo===rankGroup&&d.tipoUnidade===unitType);
   const byUnit=new Map();
   rows.forEach(d=>{
     if(!byUnit.has(d.unidade))byUnit.set(d.unidade,{total:0,race:0});
     const item=byUnit.get(d.unidade);
     item.total+=Number(d.total)||0;
     if(d.raca===rankRace)item.race+=Number(d.total)||0;
   });
   return [...byUnit.entries()].map(([unidade,v])=>({
     unidade, total:v.total, quantidade:v.race, percentual:pctOf(v.race,v.total)
   })).filter(d=>d.percentual!=null).sort((a,b)=>b.percentual-a.percentual||a.unidade.localeCompare(b.unidade,'pt-BR'));
 },[dem,rankGroup,rankRace,unitType]);

 // Crescimento: comparação 2022–2025, apenas unidades A presentes nas três tabelas.
 const growth=useMemo(()=>{
   const table={};
   evo.filter(d=>d.tipoUnidade==='A - Ensino e Pesquisa'&&(d.ano===2022||d.ano===2025)).forEach(d=>{
     table[d.unidade]??={};
     table[d.unidade][d.ano]??={};
     if(d.grupo==='Docentes')table[d.unidade][d.ano].docentes=(table[d.unidade][d.ano].docentes||0)+(Number(d.total)||0);
     else table[d.unidade][d.ano][d.grupo]=Number(d.total)||0;
   });
   return Object.entries(table).map(([unidade,v])=>{
     const a=v[2022]||{},b=v[2025]||{};
     const keys=['Alunos de graduação','docentes','Servidores'];
     // Variação percentual não é definida quando a base é zero ou está ausente.
     if(keys.some(k=>a[k]==null||b[k]==null||a[k]===0))return null;
     const change=k=>(b[k]-a[k])/a[k]*100;
     return {unidade,alunos:change('Alunos de graduação'),docentes:change('docentes'),servidores:change('Servidores'),
       alunos2022:a['Alunos de graduação'],alunos2025:b['Alunos de graduação'],
       pessoal2022:a[growthY.toLowerCase()],pessoal2025:b[growthY.toLowerCase()]};
   }).filter(Boolean).sort((a,b)=>a.unidade.localeCompare(b.unidade,'pt-BR'));
 },[evo,growthY]);
 const corr=useMemo(()=>{
   const xs=growth.map(d=>d.alunos),ys=growth.map(d=>d[growthY.toLowerCase()]);
   if(xs.length<2)return 0;
   const mx=sum(xs)/xs.length,my=sum(ys)/ys.length;
   const numerator=sum(xs.map((x,i)=>(x-mx)*(ys[i]-my)));
   const denominator=Math.sqrt(sum(xs.map(x=>(x-mx)**2))*sum(ys.map(y=>(y-my)**2)));
   return denominator?numerator/denominator:0;
 },[growth,growthY]);

 if(error)return <main className="shell"><Empty>{error}</Empty></main>;
 if(!data)return <main className="shell"><div className="loading">Carregando dados da USP…</div></main>;
 const selectUnit=u=>setSelectedUnit(u);
 const selectedLabel=selectedUnit?`Unidade selecionada: ${selectedUnit}`:'Nenhuma unidade selecionada';
 const rankTop=ranking.slice(0,ranking.length);
 return <main className="shell">
   <header className="main-header">
     <div><div className="eyebrow">USP · ANUÁRIO ESTATÍSTICO</div><h1>Uma leitura visual da comunidade universitária da USP</h1></div>
     <div className="selection-status"><span>{selectedLabel}</span>{selectedUnit&&<button className="ghost" onClick={()=>setSelectedUnit('')}>Limpar seleção</button>}</div>
   </header>
   <nav className="tabs" aria-label="Visualizações">
     {[
       ['historico','Evolução histórica'],['calor','Diversidade por unidade'],
       ['ranking','Ranking racial'],['crescimento','Crescimento e pessoal']
     ].map(([id,label],i)=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span className="tab-number">0{i+1}</span>{label}</button>)}
   </nav>

   {tab==='historico'&&<div className="content">
     <div className="section-title"><div><h2>Evolução histórica</h2><p>Variação do número de alunos, docentes e servidores ao longo do tempo.</p></div>
       <Field label="Escala"><select value={historicMode} onChange={e=>setHistoricMode(e.target.value)}><option value="absoluto">Números absolutos</option><option value="indice">Índice (primeiro ano = 100)</option></select></Field>
     </div>
     <Panel title="População universitária · 1989–2025" sub="Clique na legenda para ocultar ou exibir séries; use zoom e seleção para explorar os anos.">
       <div className="range-controls"><label>Ano inicial <input type="range" min="1989" max={yearEnd} value={yearStart} onChange={e=>setYearStart(+e.target.value)}/><b>{yearStart}</b></label><label>Ano final <input type="range" min={yearStart} max="2025" value={yearEnd} onChange={e=>setYearEnd(+e.target.value)}/><b>{yearEnd}</b></label><button className="ghost" onClick={()=>{setYearStart(1989);setYearEnd(2025)}}>Restaurar período</button></div>
       <Plot data={historical.map((s,i)=>({type:'scatter',mode:'lines+markers',name:s.name,x:s.x,y:s.y,line:{width:2.5,color:['#e6b84b','#53b6a8','#8c9fe8','#d77d78'][i]},marker:{size:5},connectgaps:false,hovertemplate:'Ano %{x}<br>'+s.name+': %{y:,.0f}<extra></extra>'}))}
         layout={{...layoutBase,hovermode:'x unified',xaxis:{...layoutBase.xaxis,title:'Ano',dtick:2},yaxis:{...layoutBase.yaxis,title:historicMode==='indice'?'Índice (primeiro ano = 100)':'Número de pessoas',rangemode:'tozero'},legend:{orientation:'h',y:-0.22},margin:{l:78,r:25,t:15,b:75}}} config={cfg} style={{width:'100%',height:490}} useResizeHandler />
       <div className="note">A série histórica foi transcrita visualmente das imagens fornecidas. Os valores precisam ser conferidos com a fonte oficial; os anos sem rótulos legíveis permanecem ausentes.</div>
     </Panel>
   </div>}

   {tab==='calor'&&<div className="content">
     <div className="section-title"><div><h2>Diversidade racial por unidade</h2><p>Explore a participação de cada categoria racial dentro de cada população e unidade.</p></div>
       <div className="filters"><Field label="População"><select value={heatGroup} onChange={e=>setHeatGroup(e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field><Field label="Tipo de unidade"><select value={unitType} onChange={e=>setUnitType(e.target.value)}>{unitTypes.map(t=><option key={t}>{t}</option>)}</select></Field></div>
     </div>
     <Panel title="Mapa de calor · participação percentual" sub="Clique em uma célula para selecionar a unidade e a categoria racial. A unidade selecionada também será destacada no ranking.">
       {heat.us.length?<Plot data={[{type:'heatmap',x:heat.us,y:races,z:heat.z,colorscale:[[0,'#14283a'],[.35,'#285b78'],[.7,'#4d91a8'],[1,'#e6b84b']],zmin:0,zmax:100,colorbar:{title:'Participação',ticksuffix:'%'},customdata:races.map((r,ri)=>heat.us.map(u=>{
         const row=dem.filter(d=>d.grupo===heatGroup&&d.tipoUnidade===unitType&&d.unidade===u);
         const total=sum(row.map(d=>d.total));const qtd=sum(row.filter(d=>d.raca===r).map(d=>d.total));return [qtd,total];
       })),hovertemplate:'Unidade: %{x}<br>Raça/cor: %{y}<br>Participação: %{z:.2f}%<br>Quantidade: %{customdata[0]:,.0f}<br>Total da população: %{customdata[1]:,.0f}<extra></extra>'}]}
         layout={{...layoutBase,xaxis:{...layoutBase.xaxis,title:'Unidade',tickangle:-45,automargin:true},yaxis:{...layoutBase.yaxis,title:'Raça/cor',automargin:true},margin:{l:115,r:85,t:20,b:125},height:Math.max(440,heat.us.length*17+210)}} config={cfg} style={{width:'100%',height:Math.max(440,heat.us.length*17+210)}} useResizeHandler onClick={ev=>{const p=ev.points?.[0];if(p){selectUnit(p.x);setRankRace(p.y);setRankGroup(heatGroup);}}}/>:<Empty>Não há dados para os filtros selecionados.</Empty>}
       <div className="note">Percentual calculado como quantidade da categoria racial ÷ total de registros da mesma população e unidade. “Não informada” é mantida no denominador.</div>
     </Panel>
   </div>}

   {tab==='ranking'&&<div className="content">
     <div className="section-title"><div><h2>Ranking de diversidade racial</h2><p>Identifique as unidades com maior participação percentual de uma categoria racial.</p></div>
       <div className="filters"><Field label="População"><select value={rankGroup} onChange={e=>setRankGroup(e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field><Field label="Raça/cor"><select value={rankRace} onChange={e=>setRankRace(e.target.value)}>{races.map(r=><option key={r}>{r}</option>)}</select></Field><Field label="Tipo de unidade"><select value={unitType} onChange={e=>setUnitType(e.target.value)}>{unitTypes.map(t=><option key={t}>{t}</option>)}</select></Field></div>
     </div>
     <Panel title={`${rankRace} · ${rankGroup}`} sub="Ordenado da maior para a menor participação. Clique em uma barra para selecionar a unidade e localizá-la no mapa de calor.">
       {rankTop.length?<Plot data={[{type:'bar',orientation:'h',x:rankTop.map(d=>d.percentual),y:rankTop.map(d=>d.unidade),customdata:rankTop.map(d=>[d.quantidade,d.total]),marker:{color:rankTop.map(d=>d.unidade===selectedUnit?'#e6b84b':'#4c9bc8'),line:{color:'#dce8ef',width:rankTop.map(d=>d.unidade===selectedUnit?1.5:0)}},hovertemplate:'%{y}<br>Participação: %{x:.2f}%<br>Quantidade: %{customdata[0]:,.0f}<br>Total da população: %{customdata[1]:,.0f}<extra></extra>'}]}
         layout={{...layoutBase,showlegend:false,xaxis:{...layoutBase.xaxis,title:'Participação na população da unidade (%)',rangemode:'tozero'},yaxis:{...layoutBase.yaxis,title:'Unidade',automargin:true,autorange:'reversed'},margin:{l:125,r:30,t:15,b:70},height:Math.max(470,rankTop.length*25+120)}} config={cfg} style={{width:'100%',height:Math.max(470,rankTop.length*25+120)}} useResizeHandler onClick={ev=>{const u=ev.points?.[0]?.y;if(u){selectUnit(u);setHeatGroup(rankGroup);}}}/>:<Empty>Não há registros para os filtros selecionados.</Empty>}
       <div className="note">O percentual de cada barra usa como denominador o total da população selecionada naquela unidade, somando todas as categorias raciais e mantendo “Não informada”.</div>
     </Panel>
   </div>}

   {tab==='crescimento'&&<div className="content">
     <div className="section-title"><div><h2>Crescimento de alunos × quadro de pessoal</h2><p>Variação percentual entre 2022 e 2025 por unidade de Ensino e Pesquisa.</p></div>
       <div className="filters"><Field label="Eixo vertical"><select value={growthY} onChange={e=>setGrowthY(e.target.value)}><option>Docentes</option><option>Servidores</option></select></Field><Field label="Rótulos"><select value={growthLabels?'sim':'nao'} onChange={e=>setGrowthLabels(e.target.value==='sim')}><option value="nao">Somente no tooltip</option><option value="sim">Exibir siglas</option></select></Field></div>
     </div>
     <Panel title={`Alunos × ${growthY.toLowerCase()}`} sub="Passe o mouse para consultar a unidade e os valores; clique em um ponto para selecioná-la nas demais visualizações.">
       <div className="corr"><span>Correlação de Pearson</span><b>{corr.toFixed(2).replace('.',',')}</b><small>{growth.length} unidades com variação calculável</small></div>
       <Plot data={[{type:'scatter',mode:growthLabels?'markers+text':'markers',x:growth.map(d=>d.alunos),y:growth.map(d=>d[growthY.toLowerCase()]),text:growth.map(d=>d.unidade),textposition:'top center',textfont:{size:8,color:'#aebdca'},customdata:growth.map(d=>[d.unidade,d.alunos2022,d.alunos2025]),marker:{size:growth.map(d=>d.unidade===selectedUnit?14:9),color:growth.map(d=>d.unidade===selectedUnit?'#e6b84b':'#4c9bc8'),line:{color:'#e3edf4',width:1},opacity:.9},hovertemplate:'%{customdata[0]}<br>Alunos: %{x:.2f}%<br>'+growthY+': %{y:.2f}%<br>Alunos em 2022: %{customdata[1]:,.0f}<br>Alunos em 2025: %{customdata[2]:,.0f}<extra></extra>'}]}
         layout={{...layoutBase,showlegend:false,hovermode:'closest',xaxis:{...layoutBase.xaxis,title:'Variação de alunos de graduação (%)',zeroline:true,zerolinewidth:1.5},yaxis:{...layoutBase.yaxis,title:`Variação de ${growthY.toLowerCase()} (%)`,zeroline:true,zerolinewidth:1.5},margin:{l:78,r:30,t:18,b:75},height:510}} config={cfg} style={{width:'100%',height:510}} useResizeHandler onClick={ev=>{const u=ev.points?.[0]?.customdata?.[0];if(u)selectUnit(u)}}/>
       <div className="note">O recorte contém 43 unidades presentes nas três tabelas. Uma unidade tem base zero em 2022, impossibilitando calcular sua variação percentual; por isso, 42 pontos são exibidos. Docentes correspondem à soma dos regimes RDIDP, RTC e RTP. Correlação não implica causalidade.</div>
     </Panel>
   </div>}
   <footer><span>Fontes: Anuário Estatístico da USP · Tabelas 2.03, 2.10, 2.13, 2.19, 2.20 e 2.21.</span><span>Projeto de Visualização Computacional · 2026/2</span></footer>
 </main>;
}
