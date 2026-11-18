(() => {
  "use strict";
  const root=document.querySelector("[data-z2r-explorer]");
  if(!root) return;
  const models=[
    {id:"wrn-25",name:"WhiteRabbitNeo 2.5 · Qwen 2.5 Coder 7B",maker:"WhiteRabbitNeo",family:"Generative LLM",task:"Security assistance",access:"Open weights",params:"7B",license:"Apache-2.0 + additional usage notice",runtime:"Transformers · vLLM",local:"Potentially local",summary:"Code-oriented security assistant fine-tuned for offensive and defensive cybersecurity workflows. Treat generated commands and findings as unverified suggestions.",good:"Security Q&A, code reasoning and supervised lab exercises.",caution:"Read the additional WhiteRabbitNeo usage-restrictions notice; base license alone may not describe all terms.",url:"https://huggingface.co/WhiteRabbitNeo/WhiteRabbitNeo-2.5-Qwen-2.5-Coder-7B",benchmark:"No independent score listed",benchmarkNote:"No comparable independent benchmark is presented in this directory."},
    {id:"foundation-sec",name:"Foundation-Sec-8B",maker:"Cisco Foundation AI",family:"Generative LLM",task:"Security language tasks",access:"Open weights",params:"8B",license:"Check model card",runtime:"Check model card",local:"Deployment-dependent",summary:"An 8-billion-parameter cybersecurity-specialized language model intended for security-focused language tasks and experimentation.",good:"Security-focused text analysis and controlled model evaluation.",caution:"A security fine-tune is not automatically a SOC-ready product. Verify current terms and inference requirements.",url:"https://huggingface.co/fdtn-ai/Foundation-Sec-8B",benchmark:"No comparable score listed",benchmarkNote:"Evaluate on your own security workload and dataset."},
    {id:"securebert",name:"SecureBERT 2.0 Base",maker:"Cisco",family:"Encoder · ModernBERT",task:"Security text intelligence",access:"Open weights",params:"Base encoder",license:"Apache-2.0",runtime:"Transformers",local:"Potentially local",summary:"A cybersecurity language encoder for contextual understanding, embeddings and downstream NLP tasks such as classification and entity recognition.",good:"Semantic search over security notes, document classification, NER and downstream fine-tuning.",caution:"Not a chat assistant. Use an embedding or classification pipeline rather than expecting conversational responses.",url:"https://huggingface.co/cisco-ai/SecureBERT2.0-base",benchmark:"Task-specific evaluation required",benchmarkNote:"Performance depends on the downstream task and dataset."},
    {id:"antares-1b",name:"Antares-1B",maker:"Cisco Foundation AI",family:"Code / localization model",task:"Vulnerability localization",access:"Open weights",params:"1B",license:"Apache-2.0",runtime:"Check model card",local:"Potentially local",summary:"A model designed to locate candidate vulnerable files in source-code repositories when given a weakness category.",good:"Prioritizing files for manual source review and navigating large repositories.",caution:"The model card reports VLoc Bench File F1 0.209. This is a file-localization metric, not general vulnerability-detection accuracy. Candidate files are not confirmed vulnerabilities.",url:"https://huggingface.co/fdtn-ai/antares-1b",benchmark:"File F1 · 0.209",benchmarkNote:"Vendor/model-card reported on VLoc Bench. File localization metric; not comparable to detection accuracy."},
    {id:"antares-350m",name:"Antares-350M",maker:"Cisco Foundation AI",family:"Code / localization model",task:"Vulnerability localization",access:"Open weights",params:"350M",license:"Check model card",runtime:"Check model card",local:"Potentially local",summary:"A compact task-specific model for vulnerability-localization research and repository-analysis experiments.",good:"Evaluating smaller task-specific models in source-repository workflows.",caution:"Confirm the current model-card license, hardware, interface and evaluation details before deployment.",url:"https://huggingface.co/fdtn-ai/antares-350m",benchmark:"Check model card",benchmarkNote:"No metric is asserted here; verify the current card before comparing."}
  ];
  const $=s=>root.querySelector(s);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const state={selected:new Set(),active:null};
  const search=$("[data-mx-search]"),task=$("[data-mx-task]"),access=$("[data-mx-access]"),sort=$("[data-mx-sort]");
  function filtered(){
    const q=search.value.trim().toLowerCase();
    return models.filter(m=>(!q||[m.name,m.maker,m.family,m.task,m.summary].join(" ").toLowerCase().includes(q))&&(!task.value||m.task===task.value)&&(!access.value||m.access===access.value))
      .sort((a,b)=>sort.value==="name"?a.name.localeCompare(b.name):sort.value==="size"?parseFloat(a.params)-parseFloat(b.params):0);
  }
  function card(m){
    return '<article class="mx-card"><div class="mx-cardtop"><div><div class="mx-maker">'+esc(m.maker)+'</div><h3>'+esc(m.name)+'</h3><div class="mx-sub">'+esc(m.family)+'</div></div><span class="mx-tag">'+esc(m.access)+'</span></div><p class="mx-desc">'+esc(m.summary)+'</p><div class="mx-meta"><div><span>Primary task</span><b>'+esc(m.task)+'</b></div><div><span>Parameters</span><b>'+esc(m.params)+'</b></div><div><span>License</span><b>'+esc(m.license)+'</b></div></div><div class="mx-actions"><a class="mx-link" href="'+esc(m.url)+'" target="_blank" rel="noopener noreferrer">Official model card ↗</a><div style="display:flex;gap:.65rem;align-items:center"><label class="mx-check"><input type="checkbox" data-mx-compare="'+esc(m.id)+'" '+(state.selected.has(m.id)?"checked":"")+'> Compare</label><button class="mx-detail" type="button" data-mx-detail="'+esc(m.id)+'">Details</button></div></div></article>';
  }
  function render(){
    const rows=filtered();$("[data-mx-grid]").innerHTML=rows.length?rows.map(card).join(""):'<div class="mx-empty">No models match these filters. Try clearing a filter or changing your search.</div>';
    $("[data-mx-count]").textContent=rows.length+" models";
    $("[data-mx-emptyfilters]").hidden=!(search.value||task.value||access.value);
    renderCompare();
  }
  function renderCompare(){
    const box=$("[data-mx-compare]");box.hidden=state.selected.size===0;
    const chosen=models.filter(m=>state.selected.has(m.id));
    $("[data-mx-selected]").textContent=chosen.length+" selected · maximum 3";
    $("[data-mx-table]").innerHTML='<thead><tr><th>Attribute</th>'+chosen.map(m=>'<th>'+esc(m.name)+'</th>').join("")+'</tr></thead><tbody>'+[
      ["Developer",m=>m.maker],["Task",m=>m.task],["Model type",m=>m.family],["Parameters",m=>m.params],["Access",m=>m.access],["License",m=>m.license],["Runtime",m=>m.runtime],["Local deployment",m=>m.local],["Published benchmark",m=>m.benchmark]
    ].map(([label,fn])=>'<tr><td>'+label+'</td>'+chosen.map(m=>'<td>'+esc(fn(m))+'</td>').join("")+'</tr>').join("")+'</tbody>';
  }
  function openDetails(id){
    const m=models.find(x=>x.id===id);if(!m)return;state.active=id;
    $("[data-mx-dialog-content]").innerHTML='<div class="mx-dialoghead"><div><div class="mx-maker">'+esc(m.maker)+'</div><h3>'+esc(m.name)+'</h3><div class="mx-sub">'+esc(m.family)+' · '+esc(m.access)+'</div></div><button class="mx-close" type="button" data-mx-close aria-label="Close details">Close ✕</button></div><p>'+esc(m.summary)+'</p><div class="mx-detailgrid">'+[['Primary task',m.task],['Parameters',m.params],['License',m.license],['Runtime',m.runtime],['Local deployment',m.local],['Published benchmark',m.benchmark]].map(([k,v])=>'<div class="mx-detailitem"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join("")+'</div><p><strong>Good fit:</strong> '+esc(m.good)+'</p><p><strong>Limitations:</strong> '+esc(m.caution)+'</p><p><strong>Benchmark note:</strong> '+esc(m.benchmarkNote)+'</p><a class="mx-link" href="'+esc(m.url)+'" target="_blank" rel="noopener noreferrer">Open official model card ↗</a>';
    const modal=$("[data-mx-modal]");modal.setAttribute("aria-hidden","false");modal.querySelector(".mx-dialog").focus();
  }
  function closeDetails(){$("[data-mx-modal]").setAttribute("aria-hidden","true");state.active=null;}
  [search,task,access,sort].forEach(el=>el.addEventListener(el===search?"input":"change",render));
  root.addEventListener("change",e=>{const id=e.target.dataset.mxCompare;if(!id)return;if(e.target.checked){if(state.selected.size>=3){e.target.checked=false;return;}state.selected.add(id);}else state.selected.delete(id);renderCompare();});
  root.addEventListener("click",e=>{const d=e.target.closest("[data-mx-detail]");if(d)openDetails(d.dataset.mxDetail);if(e.target.closest("[data-mx-close]"))closeDetails();if(e.target.matches("[data-mx-clear]")){state.selected.clear();render();}});
  $("[data-mx-modal]").addEventListener("click",e=>{if(e.target===$("[data-mx-modal]"))closeDetails();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("[data-mx-modal]").getAttribute("aria-hidden")==="false")closeDetails();});
  render();
})();