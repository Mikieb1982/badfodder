/* Historical missions live outside the standard Bad Fodder campaign.
   They may use different action profiles and do not alter campaign progress. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderHistoricalMissions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const missions=[
    {
      id:'cable-street-1936',
      title:'Cable Street',
      subtitle:'London, 4 October 1936',
      blueprintVersion:'0.1',
      status:'groundwork',
      playable:false,
      mapReady:false,
      mapResearch:{
        boundaryId:'cable-street-christian-street-slice-v1',
        masterCrs:'EPSG:27700',
        evidenceRegister:'authoring/cable-street/evidence-register.json',
        calibrationRecord:'authoring/cable-street/calibration.json',
        tracePackage:'authoring/cable-street/trace.geojson',
        reconciliationRecord:'authoring/cable-street/reconciliation.json',
        eventOverlay:'authoring/cable-street/event-overlay.geojson',
        contradictionReview:'authoring/cable-street/historical-review.json',
        uncertaintyLog:'authoring/cable-street/uncertainty-log.json',
        runtimeProjection:'authoring/cable-street/runtime-projection.json',
        runtimeObjects:'authoring/cable-street/runtime-objects.json',
        requiredGates:['MAP-01','MAP-02','MAP-03','MAP-04','MAP-05','MAP-06'],
        productionGeometryReady:false
      },
      integration:'historical',
      campaignLinked:false,
      successHeadline:'THE EAST END MARCH HAS BEEN STOPPED.',
      actionProfile:{
        firearms:false,
        grenades:false,
        contextualActions:['reinforce','carry','assist','hold','drop']
      },
      phases:[
        {
          id:'gathering',
          title:'Gathering',
          tasks:['reach-main-defence','inspect-defence-positions','deliver-material-load','assist-resident'],
          transition:'explicit-start'
        },
        {
          id:'hold-approach',
          title:'Hold the approach',
          tasks:['maintain-forward-obstruction','support-main-defence','keep-support-access-open'],
          transition:'pressure-rise-or-warned-retreat'
        },
        {
          id:'regroup',
          title:'Regroup',
          tasks:['regroup-at-main-defence','assist-injured-civilians','restore-support-access'],
          optionalRescues:3,
          transition:'regroup-complete-with-bounded-pressure'
        },
        {
          id:'they-shall-not-pass',
          title:'They Shall Not Pass',
          tasks:['keep-final-route-blocked'],
          proposedHoldSeconds:240,
          transition:'hold-complete'
        }
      ],
      defencePositions:[
        {id:'A',role:'forward-obstruction',historicalStatus:'gameplay-placement'},
        {id:'B',role:'christian-street-defence',historicalStatus:'historically-supported-vicinity'},
        {id:'C',role:'support-access',historicalStatus:'gameplay-proposal'}
      ],
      firstImplementationSlice:{
        documentedStreetSegments:1,
        mainBarricades:1,
        materialTypes:3,
        rescueInteractions:1,
        policeFormations:1
      },
      crowdBudget:{
        reactiveCivilians:24,
        functionalHelpers:8
      }
    }
  ];

  function get(id){return missions.find(m=>m.id===id)||null}
  function playable(){return missions.filter(m=>m.playable)}

  return{missions,get,playable};
});
