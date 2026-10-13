(() => {
  const breads = ['크루아상','뺑오쇼콜라','소금빵','바게트','마늘빵','우유식빵','단팥빵','크림빵','멜론빵','소보로빵','소시지빵','피자빵','꽈배기','글레이즈드 도넛','시나몬롤','프레첼','베이글','포카치아','치아바타','사워도우','호밀빵','밤빵','옥수수빵','고구마빵','카스텔라','마들렌','휘낭시에','까눌레','에그타르트','퀸아망','스콘','머핀'].map((name,index)=>({name,index}));
  const start=document.getElementById('bread-cup-start'),match=document.getElementById('bread-cup-match'),result=document.getElementById('bread-cup-result');
  if(!start||!match||!result)return;
  const roundLabel=document.getElementById('bread-cup-round'),status=document.getElementById('bread-cup-status'),progress=document.getElementById('bread-cup-progress'),choices=[...match.querySelectorAll('.bread-choice')];
  let current=[],winners=[],pairIndex=0,roundSize=16;
  const shuffle=items=>{const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
  const setPhoto=(element,bread)=>{element.style.setProperty('--bread-x',bread.index%8);element.style.setProperty('--bread-y',Math.floor(bread.index/8));};
  const labelFor=size=>size===2?'결승':size===4?'준결승':size+'강';
  const renderMatch=()=>{const pair=current.slice(pairIndex*2,pairIndex*2+2),totalPairs=current.length/2;roundLabel.textContent=labelFor(roundSize);status.textContent=`${labelFor(roundSize)} · ${pairIndex+1} / ${totalPairs} 대결`;progress.style.width=`${pairIndex/totalPairs*100}%`;choices.forEach((button,i)=>{button.querySelector('strong').textContent=pair[i].name;button.setAttribute('aria-label',`${pair[i].name} 선택`);setPhoto(button.querySelector('.bread-photo'),pair[i]);});};
  const resetStart=()=>{match.hidden=true;start.hidden=false;roundLabel.textContent='16강';status.textContent='매번 16개의 빵을 랜덤으로 선정합니다.';progress.style.width='0';};
  const begin=()=>{if(result.open)result.close();current=shuffle(breads).slice(0,16);winners=[];pairIndex=0;roundSize=16;start.hidden=true;match.hidden=false;renderMatch();};
  const choose=index=>{winners.push(current[pairIndex*2+index]);pairIndex++;if(pairIndex<current.length/2){renderMatch();return;}progress.style.width='100%';if(winners.length===1){const winner=winners[0];match.hidden=true;roundLabel.textContent='우승';status.textContent='오늘의 빵 취향을 찾았어요!';document.getElementById('bread-cup-winner-name').textContent=winner.name;document.getElementById('bread-cup-result-copy').textContent=`오늘은 ${winner.name}과 함께 빵지순례를 떠나보세요.`;setPhoto(document.getElementById('bread-cup-winner-photo'),winner);try{localStorage.setItem('bbangbang_bread_cup_winner_v1',JSON.stringify({name:winner.name,index:winner.index,date:new Date().toISOString().slice(0,10)}));}catch(_){}result.showModal();return;}current=winners;winners=[];pairIndex=0;roundSize=current.length;renderMatch();};
  document.getElementById('bread-cup-start-button').addEventListener('click',begin);
  document.getElementById('bread-cup-restart').addEventListener('click',begin);
  document.getElementById('bread-cup-confirm').addEventListener('click',()=>{result.close();resetStart();});
  result.addEventListener('cancel',event=>{event.preventDefault();result.close();resetStart();});
  choices.forEach((button,index)=>button.addEventListener('click',()=>choose(index)));
})();
