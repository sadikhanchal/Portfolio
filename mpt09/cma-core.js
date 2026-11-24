/* CMA DHC1295 local domain engine. No persistence, networking or UI dependencies. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CMA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var FORMS = Object.freeze({
    DTF: 'Documents Transmittal Form', DRW: 'Transmittal of Drawings',
    MIS: 'Application of Material Approval', R: 'Daily Report',
    MIR: 'Inspection of Materials Delivered to Site', PQA: "Supplier's / Sub-Contractor's Approval",
    NCR: 'NON-CONFORMANCE REPORT', RFI: 'Request for Inspection',
    SCR: 'Site Clarification Request', TQ: 'Technical Enquiry'
  });
  var STATUS = {
    UNRECORDED: {label:'Not recorded',color:'#64748b',stage:'Not recorded'},
    PREPARING: {label:'Preparing',color:'#475569',stage:'Authors'},
    INTERNAL: {label:'Under review (Internal)',color:'#7c3aed',stage:'Internal review'},
    INTERNAL_REVISE: {label:'Requested to revise (Internal)',color:'#d97706',stage:'Authors'},
    READY: {label:'Ready for submission',color:'#0891b2',stage:'DC'},
    SUBMITTED: {label:'Submittal Waiting Response',color:'#2563eb',stage:'Designshouse'},
    CODE_A: {label:'Code A — Approved',color:'#15803d',stage:'DC'},
    CODE_B: {label:'Code B — Approved with comments',color:'#65a30d',stage:'DC'},
    CODE_C: {label:'Code C — Revise and resubmit',color:'#ea580c',stage:'DC'},
    CODE_D: {label:'Code D — No review required',color:'#64748b',stage:'DC'}
  };
  Object.keys(STATUS).forEach(function(k){Object.freeze(STATUS[k]);}); Object.freeze(STATUS);
  var own = function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
  var isObject = function(x){return x !== null && typeof x === 'object' && !Array.isArray(x);};
  var norm = function(x){return typeof x === 'string' ? x.trim().toUpperCase() : '';};
  var response = function(s){return /^CODE_[ABCD]$/.test(s);};
  var revisionRE = /^(0|[1-9]\d*)$/;
  function fail(message){throw new Error('CMA: '+message);}
  function string(x,label,nonempty){if(typeof x!=='string'||(nonempty&&!x.trim()))fail(label+' must be '+(nonempty?'a non-empty':'a')+' string');}
  function code(x,label){if(typeof x!=='string'|| !/^[A-Z0-9]{2,8}$/.test(x))fail(label+' must contain 2–8 uppercase letters/digits');return x;}
  function form(x){if(typeof x!=='string'||!own(FORMS,x))fail('Unknown form '+String(x));return x;}
  function serial(x){if(!Number.isSafeInteger(x)||x<1)fail('Serial must be a positive safe integer');return x;}
  function pad(x){return String(serial(x)).padStart(3,'0');}
  function tnNumber(f,n){form(f);return (f==='TQ'?'MAWANI-DHC-DMM-ISS-TQ-':f==='R'?'CMA-DHC-AZR-PT-ISS-R-':'CMA-DHC-AZR-ISS-'+f+'-')+pad(n);}
  function docNumber(t,d,n){return 'CMA-1042-'+code(t,'Document type')+'-'+code(d,'Discipline')+'-AZR-S03-'+pad(n);}
  function validDate(x){
    if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
    var d=new Date(x+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;
  }
  function checkDate(x,label,optional){if(optional&&x==='')return;if(!validDate(x))fail(label+' must be a real YYYY-MM-DD date');}
  function today(){var d=new Date();return String(d.getFullYear()).padStart(4,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  // Start excluded, end included. Friday is the sole excluded weekday. Reverse ranges are unknown.
  function workingDays(from,to){
    if(!validDate(from)||!validDate(to)||to<from)return null;
    var a=new Date(from+'T00:00:00Z'),b=new Date(to+'T00:00:00Z');
    var days=Math.round((b-a)/86400000),weeks=Math.floor(days/7),result=weeks*6;
    for(var i=1;i<=days%7;i++)if((a.getUTCDay()+i)%7!==5)result++;
    return result;
  }
  function findConflicts(data,query){
    query=query||{};var tn=norm(query.tnNum),dn=norm(query.docNum);
    return {
      transmittals:tn?data.transmittals.filter(function(t){return norm(t.num)===tn;}):[],
      documents:dn?data.documents.filter(function(d){return norm(d.num)===dn;}).map(function(d){return Object.assign({},d,{relatedTransmittals:data.transmittals.filter(function(t){return t.documentIds.indexOf(d.id)!==-1;})});}):[]
    };
  }
  function nextTnSerial(data,f){validate(data);form(f);var max=0;data.transmittals.forEach(function(t){if(t.form===f)max=Math.max(max,t.serial);});return serial(max+1);}
  function nextDocSerial(data,t,d){validate(data);code(t,'Document type');code(d,'Discipline');var max=0;data.documents.forEach(function(x){if(x.type===t&&x.discipline===d)max=Math.max(max,x.serial);});return serial(max+1);}
  // Returns true, never repairs/mutates the caller's snapshot. Missing imported dates remain unknown.
  function validate(data){
    if(!isObject(data))fail('Snapshot must be an object');
    if(data.schemaVersion!==1)fail('Unsupported schemaVersion; expected 1');
    if(data.project!=='DHC1295')fail('Wrong project; expected DHC1295');
    string(data.version,'Snapshot version',false);string(data.publishedAt,'publishedAt',false);
    if(!isObject(data.catalogs))fail('catalogs must be an object');
    ['disciplines','documentTypes'].forEach(function(k){
      if(!isObject(data.catalogs[k]))fail('catalogs.'+k+' must be an object');
      Object.keys(data.catalogs[k]).forEach(function(c){code(c,'Catalog code');string(data.catalogs[k][c],'Catalog '+k+'.'+c,true);});
    });
    if(!Array.isArray(data.documents)||!Array.isArray(data.transmittals))fail('documents and transmittals must be arrays');
    var ids=new Set(),docs=new Map(),tns=new Map(),docIds=new Set();
    function id(x,label){string(x,label+' id',true);if(x!==x.trim())fail(label+' id cannot have outer whitespace');if(ids.has(x))fail('Duplicate id '+x+' ('+label+')');ids.add(x);}
    // Full-identity duplicate checks deliberately precede component checks (case/outer-space insensitive).
    data.documents.forEach(function(d){if(!isObject(d))fail('Each document must be an object');string(d.num,'Document number',true);var n=norm(d.num);if(docs.has(n))fail('Duplicate document number '+n);docs.set(n,d);});
    data.transmittals.forEach(function(t){if(!isObject(t))fail('Each transmittal must be an object');string(t.num,'Transmittal number',true);var n=norm(t.num);if(tns.has(n))fail('Duplicate transmittal number '+n);tns.set(n,t);});
    data.documents.forEach(function(d){
      id(d.id,'Document');docIds.add(d.id);string(d.title,'Document '+d.id+' title',false);
      if(own(d,'rev')&&(typeof d.rev!=='string'||!revisionRE.test(d.rev)))fail('Invalid revision for document '+d.num+'; use numeric strings 0, 1, 2 etc.');
      var expected=docNumber(d.type,d.discipline,d.serial);
      if(norm(d.num)!==expected)fail('Document '+d.id+' number must match components: '+expected);
    });
    data.transmittals.forEach(function(t){
      id(t.id,'Transmittal');string(t.title,'Transmittal '+t.id+' title',false);string(t.owner,'Transmittal '+t.id+' owner',false);
      var expected=tnNumber(t.form,t.serial);if(norm(t.num)!==expected)fail('Transmittal '+t.id+' number must match components: '+expected);
      if(typeof t.rev!=='string'||!revisionRE.test(t.rev))fail('Invalid revision for '+t.num+'; use numeric strings 0, 1, 2 etc.');
      if(typeof t.status!=='string'||!own(STATUS,t.status))fail('Invalid status for '+t.num+'; use UNRECORDED for missing imported status');
      checkDate(t.submittedDate,'Submission date for '+t.num,true);checkDate(t.responseDate,'Response date for '+t.num,true);
      if(t.responseDate&&!t.submittedDate)fail('Response date for '+t.num+' requires a submission date');
      if(t.responseDate&&t.responseDate<t.submittedDate)fail('Response cannot precede submission for '+t.num);
      if(!Array.isArray(t.documentIds))fail('documentIds must be an array for '+t.num);
      var links=new Set();t.documentIds.forEach(function(x){if(!docIds.has(x))fail('Missing document reference '+String(x)+' in '+t.num);if(links.has(x))fail('Duplicate document reference '+x+' in '+t.num);links.add(x);});
      if(!Array.isArray(t.history))fail('history must be an array for '+t.num);
      var last='';t.history.forEach(function(e){
        if(!isObject(e))fail('History event must be an object for '+t.num);id(e.id,'History event');
        checkDate(e.at,'History event date',false);if(last&&e.at<last)fail('History event dates must be chronological for '+t.num);last=e.at;
        if(typeof e.status!=='string'||!own(STATUS,e.status))fail('Invalid history status for '+t.num);
        if(typeof e.rev!=='string'||!revisionRE.test(e.rev))fail('Invalid history revision for '+t.num);
        string(e.owner,'History event owner',false);string(e.kind,'History event kind',true);
      });
    });
    return true;
  }
  function nextRevision(tn){
    if(!tn||typeof tn.rev!=='string'||!revisionRE.test(tn.rev))fail('A valid numeric revision string is required');
    // Decimal string arithmetic preserves exact revisions beyond Number.MAX_SAFE_INTEGER.
    var digits=tn.rev.split(''),j=digits.length-1;
    while(j>=0&&digits[j]==='9'){digits[j]='0';j--;}
    if(j<0)digits.unshift('1');else digits[j]=String(Number(digits[j])+1);
    return digits.join('');
  }
  function actionTarget(data,id,date){
    validate(data);var t=data.transmittals.find(function(x){return x.id===id;});if(!t)fail('Transmittal not found: '+String(id));
    checkDate(date,'Action date',false);if(date>today())fail('Action date cannot be in the future');
    var last=t.history.length?t.history[t.history.length-1].at:'';
    if(last&&date<last)fail('Action date cannot precede previous history event '+last);
    if(t.responseDate&&date<t.responseDate)fail('Action date cannot precede recorded response '+t.responseDate);
    if(t.submittedDate&&date<t.submittedDate)fail('Action date cannot precede recorded submission '+t.submittedDate);
    return t;
  }
  var counter=0;
  function eventId(data){
    var used=new Set();data.documents.concat(data.transmittals).forEach(function(x){used.add(x.id);if(x.history)x.history.forEach(function(e){used.add(e.id);});});
    var id;do{id='cma-event-'+Date.now().toString(36)+'-'+(++counter).toString(36);}while(used.has(id));return id;
  }
  function commit(data,t,changes,date,kind){
    var updated=Object.assign({},t,changes,{history:t.history.concat([{id:eventId(data),at:date,status:changes.status,rev:changes.rev||t.rev,owner:t.owner,kind:kind}])});
    var test=Object.assign({},data,{transmittals:data.transmittals.map(function(x){return x===t?updated:x;})});validate(test);
    Object.assign(t,updated);return t;
  }
  // Mutate only on success; return the updated transmittal. No persistence/publication occurs.
  function setStatus(data,id,status,date){
    if(typeof status!=='string'||!own(STATUS,status)||status==='UNRECORDED')fail('Choose a recorded workflow status (not UNRECORDED)');
    var t=actionTarget(data,id,date);
    if(response(t.status)&&!response(status))fail('Use startRevision to reopen a consultant response');
    var changes={status:status};
    if(status==='SUBMITTED'){changes.submittedDate=date;changes.responseDate='';}
    if(response(status)){if(!t.submittedDate)fail('Record a submission date before recording a consultant response');if(date<t.submittedDate)fail('Response cannot precede submission');changes.responseDate=date;}
    return commit(data,t,changes,date,'status');
  }
  function startRevision(data,id,date){
    var t=actionTarget(data,id,date);if(!response(t.status))fail('Start revision is available only after Code A, B, C or D');
    return commit(data,t,{rev:nextRevision(t),status:'PREPARING',submittedDate:'',responseDate:''},date,'revision');
  }
  return Object.freeze({FORMS:FORMS,STATUS:STATUS,tnNumber:tnNumber,docNumber:docNumber,nextTnSerial:nextTnSerial,nextDocSerial:nextDocSerial,findConflicts:findConflicts,validate:validate,workingDays:workingDays,nextRevision:nextRevision,setStatus:setStatus,startRevision:startRevision});
}));
