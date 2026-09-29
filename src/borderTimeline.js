import { MAPCHART_BY_ID, transferMapchartGroup } from './territory.js';

// End-of-month snapshots on the attached MapChart state geometry. Occupation and
// annexation both change the map's effective controller; this is not a legal
// sovereignty model. The provinces are coarser than several historical borders.
const mainlandFrance = [
  'Nord_Pas_de_Calais','Picardy','Normandy','Champagne','Alsace_Lorraine',
  'Ile_de_France','Franche_Comte','Brittany','Loire','Bourgogne','Centre',
  'Poitou','Rhone','Auvergne','Limousin','Savoy','Alpes','Aquitaine',
  'Languedoc','Bouches_du_Rhone','Midi_Pyrenees','Var','Pyrénées_Atlantiques'
];
const occupiedFrance = [
  'Nord_Pas_de_Calais','Picardy','Normandy','Champagne','Alsace_Lorraine',
  'Ile_de_France','Franche_Comte','Brittany','Loire','Bourgogne','Centre','Poitou'
];
const vichyFrance = mainlandFrance.filter(id => !occupiedFrance.includes(id));
const denmark = ['Jylland','Sjaelland','Fyn','Sønderjylland','Bornholm'];
const norway = ['Finnmark','Troms','Nordland','Helgeland','Trøndelag','Vestlandet','Opplandene','Telemark','Oslofjord','Agder'];
const baltic = {
  EST: ['Harju','Virumaa','Saaremaa','Pärnu','Tartu'],
  LVA: ['Vidzeme','Kurzeme','Latgale','Zemgale','Rīga'],
  LTU: ['Aukštaitija','Žemaitija','Kaunas','Sūduva','Wilno']
};
const westernPoland = ['Gdynia','Poznan','Płock','Lodz','Warszawa','Kielce','Kraków','Lublin','Katowice'];
const easternPoland = ['Białystok','Nowogródek','Polesie','Wołyn','Wilejka','Lwów','Stanisławów'];
const yugoslavia = ['North_Slovenia','Ljubljana','Croatia','Dalmatia','Bosnia','Herzegovina','Serbia','Morava','Montenegro','Southern_Serbia','Kosovo','Debar','Macedonia','West_Banat','Backa'];
const greece = ['Thrace','Central_Macedonia','Epirus','Attica','Peloponnese','Aegean_Islands','Crete'];
const czechoslovakia = ['North_Sudetenland','South_Sudetenland','Bohemia','Czeské_Slezsko','Tešínsko','Moravia','Eastern_Slovakia','Western_Slovakia','Southern_Slovakia','Podkarpatská_Rus'];

const change = (id, year, month, text, transfers, when = () => true) => ({ id, year, month, text, transfers, when });
export const BORDER_TIMELINE = [
  change('memel', 1939, 3, '독일이 리투아니아로부터 클라이페다(메멜)를 할양받았다.', [['GER',['Klaipeda']]]),
  change('albania', 1939, 4, '이탈리아가 알바니아를 병합했다.', [['ITA',['Shkodër','Albania','Northern_Epirus']]]),
  change('vilnius', 1939, 10, '소련이 빌뉴스 지역을 리투아니아에 넘겼다.', [['LTU',['Wilno']]], s => Boolean(s.flags.poland)),
  change('winter_war', 1940, 3, '겨울전쟁 강화조약에 따라 핀란드가 일부 국경 지역을 소련에 할양했다.', [['SOV',['Karjala','Salla']]]),
  change('denmark', 1940, 4, '독일군이 덴마크 본토를 점령했다.', [['GER',denmark]]),
  change('benelux', 1940, 5, '독일군이 베네룩스의 유럽 영토를 점령했다.', [['GER',['Friesland','Holland','Brabant','Vlaanderen','Antwerpen','Ardennes','Wallonie','Luxembourg']]]),
  change('norway', 1940, 6, '노르웨이 본토가 독일군의 점령 아래 들어갔다.', [['GER',norway]]),
  change('baltic_annexation', 1940, 6, '소련군이 발트 3국을 점령했다. 공식 병합은 8월에 이루어졌다.', [['SOV',[...baltic.EST,...baltic.LVA,...baltic.LTU]]]),
  change('bessarabia', 1940, 6, '소련이 루마니아의 베사라비아와 북부 부코비나를 점령했다.', [['SOV',['Bessarabia','Southern_Bessarabia','Bucovina']]]),
  change('north_transylvania', 1940, 8, '제2차 빈 중재로 북부 트란실바니아가 헝가리로 넘어갔다.', [['HUN',['North_Transylvania']]]),
  change('south_dobruja', 1940, 9, '크라이오바 조약으로 남부 도브루자가 불가리아로 넘어갔다.', [['BGR',['Dobrudja']]]),
  change('balkans', 1941, 4, '추축국이 유고슬라비아를 분할하고 그리스 본토를 점령했다.', [
    ['GER',['North_Slovenia','Serbia','Morava','Southern_Serbia','Central_Macedonia','Attica']],
    ['ITA',['Ljubljana','Dalmatia','Montenegro','Kosovo','Debar','Epirus','Peloponnese','Aegean_Islands']],
    ['HRV',['Croatia','Bosnia','Herzegovina']],
    ['HUN',['Backa']], ['BGR',['Macedonia','Thrace']], ['GER',['West_Banat']]
  ]),
  change('crete', 1941, 5, '크레타가 독일군의 점령 아래 들어갔다.', [['GER',['Crete']]]),
  change('bessarabia_1941', 1941, 7, '루마니아군이 베사라비아와 북부 부코비나를 다시 점령했다.', [['ROU',['Bessarabia','Southern_Bessarabia','Bucovina']]]),
  change('eastern_poland', 1941, 7, '독일의 소련 침공 뒤 동부 폴란드와 발트 지역이 독일군 점령 아래 들어갔다.', [
    ['GER',[...easternPoland,...baltic.EST,...baltic.LVA,...baltic.LTU]]
  ], s => Boolean(s.flags.poland)),
  change('vichy_occupation', 1942, 11, '독일군이 비시 프랑스의 남부 비점령 지역도 점령했다.', [['GER',vichyFrance]], s => s.flags.france1940 === 'armistice'),
  change('albania_1943', 1943, 9, '이탈리아의 항복 뒤 독일군이 알바니아를 점령했다.', [['GER',['Shkodër','Albania','Northern_Epirus']]]),
  change('liberated_france_1', 1944, 6, '노르망디 상륙 뒤 연합군이 해안 지역을 탈환했다.', [['FRA',['Normandy']]], s => s.flags.france1940 === 'armistice'),
  change('liberated_france_2', 1944, 8, '파리와 프랑스 본토의 대부분이 해방되었다.', [['FRA',mainlandFrance.filter(id => id !== 'Alsace_Lorraine')]], s => s.flags.france1940 === 'armistice'),
  change('romania_1944', 1944, 8, '소련군이 베사라비아를 다시 점령했고 루마니아는 추축국에서 이탈했다.', [['SOV',['Bessarabia','Southern_Bessarabia','Bucovina']]]),
  change('baltic_1944', 1944, 10, '소련군이 발트 지역 대부분을 재점령했다. 쿠를란트는 아직 독일군이 통제했다.', [['SOV',[...baltic.EST,...baltic.LVA.filter(id => id !== 'Kurzeme'),...baltic.LTU]]]),
  change('belgium_1944', 1944, 10, '벨기에와 룩셈부르크의 주요 지역이 해방되었다.', [['BEL',['Vlaanderen','Antwerpen','Ardennes','Wallonie']],['LUX',['Luxembourg']]]),
  change('greece_1944', 1944, 11, '그리스 본토가 독일군 점령에서 벗어났다.', [['GRC',greece.filter(id => id !== 'Crete')]]),
  change('albania_1944', 1944, 11, '알바니아가 독일군 점령에서 벗어났다.', [['ALB',['Shkodër','Albania','Northern_Epirus']]]),
  change('alsace_1945', 1945, 2, '알자스·로렌 지역이 프랑스 통제로 돌아왔다.', [['FRA',['Alsace_Lorraine']]], s => s.flags.france1940 === 'armistice'),
  change('war_end', 1945, 5, '독일의 항복 뒤 서유럽의 점령이 종료되고 동유럽의 국경이 다시 바뀌었다.', [
    ['DNK',denmark], ['NOR',norway], ['NLD',['Friesland','Holland','Brabant']],
    ['SOV',['Kurzeme','Klaipeda']], ['GRC',['Crete']], ['POL',[...westernPoland,'Białystok']],
    ['SOV',['Königsberg','Wilno','Podkarpatská_Rus']],
    ['POL',['Hinterpommern','Niederschlesien','Oberschlesien']],
    ['CZE',czechoslovakia.filter(id => id !== 'Podkarpatská_Rus')],
    ['ROU',['North_Transylvania']], ['YUG',yugoslavia]
  ])
];

for (const item of BORDER_TIMELINE)
  for (const [, ids] of item.transfers)
    for (const id of ids)
      if (!MAPCHART_BY_ID.has(id)) throw new Error(`지도에 없는 지역: ${item.id} / ${id}`);

export function applyBorderTimeline(state, record) {
  for (const item of BORDER_TIMELINE) {
    if (item.year !== state.year || item.month !== state.month ||
        state.flags[`border_${item.id}`] || !item.when(state)) continue;
    for (const [owner, ids] of item.transfers)
      Object.assign(state, transferMapchartGroup(state, ids, owner));
    state.flags[`border_${item.id}`] = true;
    record(state, item.text, 'news');
  }
}
