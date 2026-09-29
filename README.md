# 국가의 시간 · 1936

1936년 프랑스 제3공화국을 운영하는 브라우저 전략 시뮬레이터입니다.

## 실행

Node.js 20 이상에서 `npm run dev`를 실행하고 `http://localhost:4173`에 접속합니다. `npm test`는 게임 진행, 저장 데이터, 지도 소유권 변화를 검증하며 `npm run build`는 `dist/`를 생성합니다.

## 첨부 지도 기반 지역 지도

- 사용자가 제공한 `assets/mapchart-source.svg`의 **1,081개 지역 경로**를 그대로 추출해 `src/mapchart.js`로 그립니다. 유럽과 세계 보기에서 확대, 이동, 지역 선택, 소유권 변경을 지원합니다.
- 같은 버전의 [MapChart Hearts of Iron IV States](https://www.mapchart.net/hearts-of-iron-iv.html) 1936년 게임 시작 배색을 지역 ID로 대조해 `src/mapchart1936.js`에 기록했습니다. 단치히는 게임 배색과 달리 1936년 자유시로 수정했습니다. 독일 동프로이센, 폴란드, 체코슬로바키아, 오스트리아 등은 원본의 분리된 지역 경계를 사용합니다.
- 재생성: `python3 scripts/generate-mapchart.py` (Python lxml 필요). SVG 경로와 배색의 지역 ID가 하나라도 일치하지 않으면 생성에 실패합니다.
- 플레이어가 직접 바꾼 지역은 세이브 데이터에 기록됩니다. 이전 버전의 세이브 파일도 읽을 수 있습니다.
- 1938년 오스트리아·주데텐란트·테신·슬로바키아 남부, 1939년 체코·클라이페다·알바니아·폴란드·빌뉴스, 1940년 겨울전쟁·서유럽 점령·발트 3국·루마니아 영토 양도, 1941년 발칸 분할, 1942~45년 프랑스 점령·해방 및 일부 유럽의 해방을 월별 지역 소유권 규칙으로 연결했습니다. `src/borderTimeline.js`의 날짜·지역·조건을 수정해 확장합니다. 프랑스의 1940년 선택은 역사/가상 역사 분기로 나뉩니다.

**범위:** MapChart의 1936년 시작 배색은 역사적 원자료가 아닌 게임 배색입니다. 단치히 이외 전 세계의 1936년 소유권을 독립적으로 모두 검증한 상태는 아닙니다. 이 지도의 색은 점령과 병합을 통틀어 **지도상 통제 주체**를 표현하며 법적 주권과 구분해야 합니다. 원본의 고정된 1,081개 지역은 역사적 경계와 일치하지 않는 곳이 있어, 핀란드 동부·프랑스 휴전선·발칸 분할 등은 지역 단위 근사입니다. 독소전쟁의 매월 전선, 식민지 지배 변화 전체, 1945년 이후 변동은 구현하지 않았습니다. 따라서 모든 날짜에 완벽한 역사 지도를 제공한다고 주장하지 않습니다. 별도 참고 지도 탭은 [OpenHistoricalMap](https://www.openhistoricalmap.org/)의 선택한 날짜 자료를 보여주며, 게임에서 직접 수정한 통제 주체는 그 원본에 반영되지 않습니다.

주요 사건 날짜와 분할의 교차 확인: [미국 홀로코스트 기념관의 1939~45 전쟁 연표](https://encyclopedia.ushmm.org/content/en/article/world-war-ii-key-dates), [서유럽 점령](https://encyclopedia.ushmm.org/content/en/article/german-wartime-expansion), [체코슬로바키아의 영토 이동](https://encyclopedia.ushmm.org/content/en/article/czechoslovakia), [유고슬라비아 분할](https://encyclopedia.ushmm.org/content/en/article/axis-invasion-of-yugoslavia), [1939년 메멜 양도에 관한 미 국무부 외교문서](https://history.state.gov/historicaldocuments/frus1939v01/d88). 지역 전체를 색칠해야 하는 데이터 제약 때문에 이 참고 자료가 각 지역 다각형의 정확한 전선을 보증하지는 않습니다.

## 기타 기능

월 단위 경제·정치·군사 시뮬레이션과 역사 사건, 로컬 저장 슬롯 세 개, Supabase 이메일 로그인과 클라우드 저장 슬롯 세 개가 있습니다. Supabase `game_saves`는 소유자별 RLS를 적용합니다.

## 출처와 라이선스

첨부 SVG에 내장된 메타데이터에 따라 지도 제작자는 [MapChart.net](https://www.mapchart.net/about.html)이며, 원본 SVG와 여기서 가공한 지역 경계 및 배색 데이터는 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)으로 표기합니다. 지도 수정 사항: 지역 경로 추출, 국가별 게임 색상 변경, 1936년 단치히 보정, 날짜와 사건별 통제 모델 추가. MapChart의 지도는 Wikimedia에서 각색한 자료를 포함할 수 있습니다. 구버전 세이브 호환을 위한 `src/regions.js`는 [Natural Earth](https://www.naturalearthdata.com/)의 공개 도메인 행정구역 자료를 사용합니다.
