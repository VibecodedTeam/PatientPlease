import type { RealCaseSeed } from './realCases.js';

/**
 * Wholly invented cases (patient, presentation, and diagnosis all authored by Claude, not
 * drawn from any real-world case report) added to widen diagnosis-category coverage beyond
 * the melanoma-heavy REAL_CASES set — several catalog diagnoses (psoriasis, acne, vitiligo,
 * etc.) previously had zero case coverage in gameplay. Every case's `sourceNote` discloses
 * this fictional origin, per the same transparency convention REAL_CASES uses for its
 * generated-conclusion cases.
 */
export const FICTIONAL_CASES: RealCaseSeed[] = [
  {
    patientName: 'Edward Sokołowski',
    age: 68,
    sex: 'MALE',
    occupation: 'Emeryt',
    bodyRegion: 'LEFT_HAND',
    imageFile: 'case-32.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja wycinkowa potwierdza chorobę Bowena (raka kolczystokomórkowego in situ).',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia ekspozycji na promieniowanie UV',
        content: {
          history: 'Całe życie pracował na zewnątrz jako stolarz, rzadko używając ochrony przeciwsłonecznej na dłonie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmiany',
        content: {
          description:
            'Od około roku na grzbiecie lewej dłoni utrzymuje się dobrze odgraniczona, czerwonawa, łuszcząca się plama o nierównych brzegach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg zmiany',
        content: {
          description: 'Zmiana powoli powiększa się, nie boli i nie swędzi, ale nigdy się nie goi.',
        },
      },
    ],
    diagnosisCode: 'bowens-disease',
    treatmentCode: 'photodynamic-therapy',
    difficulty: 2,
    resultExplanationText:
      'Przewlekła, łuszcząca się, czerwona plama niegojąca się od roku — choroba Bowena, leczona terapią fotodynamiczną.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Teresa Malinowska',
    age: 60,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'BACK',
    imageFile: 'case-33.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje typowy obraz "przyklejonej" narośli z czopami rogowymi — cechy jednoznacznie łagodne.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: {
          history: 'Ogólnie zdrowa, bez przewlekłych schorzeń ani wcześniejszych nowotworów skóry.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd narośli',
        content: {
          description:
            'Na plecach od kilku lat obecna jest brązowa, nieco chropowata narośl, jakby "przyklejona" do skóry.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg zmiany',
        content: {
          description: 'Nie zmienia się, nie boli, czasem tylko przeszkadza pod ubraniem.',
        },
      },
    ],
    diagnosisCode: 'seborrheic-keratosis',
    treatmentCode: 'no-treatment',
    difficulty: 1,
    resultExplanationText:
      'Stabilna, chropowata, "przyklejona" narośl na plecach — łagodne rogowacenie łojotokowe, niewymagające leczenia.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Weronika Kowalczyk',
    age: 25,
    sex: 'FEMALE',
    occupation: 'Nauczycielka',
    bodyRegion: 'LEFT_LEG',
    imageFile: 'case-34.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje symetryczną strukturę i regularną pigmentację — typowy obraz łagodnego znamienia melanocytowego.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Znamiona u krewnych',
        content: {
          history: 'Matka i babcia mają liczne, podobne znamiona.',
        },
      },
      {
        type: 'FAMILY_HISTORY',
        title: 'Wywiad w kierunku czerniaka',
        content: {
          history: 'W rodzinie nie odnotowano przypadków czerniaka.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Objawy kliniczne',
        content: {
          description:
            'Niewielkie, gładkie, jednolicie brązowe znamię na lewej łydce, obecne od dzieciństwa, bez żadnych zmian kształtu ani koloru.',
        },
      },
    ],
    diagnosisCode: 'common-nevus',
    treatmentCode: 'watchful-waiting',
    difficulty: 1,
    resultExplanationText:
      'Stabilne, symetryczne, jednolicie zabarwione znamię obecne od dzieciństwa — zwykłe znamię melanocytowe, wymagające jedynie okresowej obserwacji.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Grzegorz Pawlak',
    age: 34,
    sex: 'MALE',
    occupation: 'Elektryk',
    bodyRegion: 'RIGHT_LEG',
    imageFile: 'case-35.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja potwierdza włókniaka twardego (dermatofibroma) — łagodną zmianę tkanki łącznej.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Stan zdrowia ogólny',
        content: {
          history: 'Ogólnie zdrowy.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Narażenie na skaleczenia w pracy',
        content: {
          history: 'Pracuje jako elektryk, często ulega drobnym skaleczeniom w pracy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd guzka',
        content: {
          description: 'Twardy, brązowawy guzek na podudziu prawej nogi, obecny od kilku lat po drobnym skaleczeniu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Objaw wciągania',
        content: {
          description: 'Charakterystycznie wciąga się do wewnątrz przy ściśnięciu z boków.',
        },
      },
    ],
    diagnosisCode: 'dermatofibroma',
    treatmentCode: 'no-treatment',
    difficulty: 1,
    resultExplanationText:
      'Twardy guzek wciągający się przy ucisku, powstały po drobnym urazie — klasyczny obraz włókniaka twardego, zmiany łagodnej.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Kinga Wieczorek',
    age: 29,
    sex: 'FEMALE',
    occupation: 'Fotografka',
    bodyRegion: 'RIGHT_HAND',
    imageFile: 'case-36.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia oraz badanie w lampie Wooda wykazują obustronnie symetryczne odbarwienia skóry bez cech zapalnych — obraz typowy dla bielactwa.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Rozpoznanie choroby Hashimoto',
        content: { history: 'Choroba Hashimoto rozpoznana dwa lata temu.' },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Inne schorzenia przewlekłe',
        content: { history: 'Brak innych schorzeń przewlekłych.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd odbarwień',
        content: {
          description:
            'Na grzbietach obu dłoni stopniowo pojawiły się mleczno-białe plamy o ostrych granicach, całkowicie pozbawione barwnika.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Dolegliwości i odczucia pacjentki',
        content: {
          description: 'Zmiany nie bolą ani nie swędzą, ale bardzo ją niepokoją estetycznie.',
        },
      },
    ],
    diagnosisCode: 'vitiligo',
    treatmentCode: 'phototherapy-uvb',
    difficulty: 2,
    resultExplanationText:
      'Symetryczne, ostro odgraniczone, mlecznobiałe plamy odbarwieniowe u pacjentki z chorobą Hashimoto — bielactwo, leczone fototerapią UVB.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Justyna Kamińska',
    age: 33,
    sex: 'FEMALE',
    occupation: 'Projektantka wnętrz',
    bodyRegion: 'HEAD',
    imageFile: 'case-37.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Ocena w lampie Wooda oraz dermoskopia potwierdzają powierzchowną hiperpigmentację naskórkową typową dla ostudy.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Niedawny poród',
        content: {
          history: 'Trzy miesiące temu urodziła drugie dziecko.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Antykoncepcja hormonalna',
        content: {
          history: 'Od miesiąca przyjmuje tabletkę antykoncepcyjną.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Objawy kliniczne',
        content: {
          description:
            'Symetryczne, brązowe plamy na policzkach i nad górną wargą, pojawiające się stopniowo od czasu ciąży i nasilające się latem.',
        },
      },
    ],
    diagnosisCode: 'melasma',
    treatmentCode: 'topical-retinoid',
    difficulty: 1,
    resultExplanationText:
      'Symetryczna hiperpigmentacja twarzy związana z ciążą i antykoncepcją hormonalną — ostuda, leczona miejscowym retinoidem i fotoprotekcją.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Mariusz Jaworski',
    age: 41,
    sex: 'MALE',
    occupation: 'Kierowca ciężarówki',
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-38.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne oraz dermoskopia potwierdzają srebrzyste, dobrze odgraniczone blaszki typowe dla łuszczycy zwykłej.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: { history: 'Ojciec pacjenta chorował na łuszczycę przez całe dorosłe życie.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd blaszek',
        content: {
          description:
            'Na łokciach i kolanach od kilku lat nawracają grube, srebrzyście łuszczące się, czerwone blaszki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Czynniki nasilające',
        content: {
          description: 'Objawy nasilają się zimą i w okresach stresu.',
        },
      },
    ],
    diagnosisCode: 'psoriasis',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 1,
    resultExplanationText:
      'Nawracające, srebrzyście łuszczące się czerwone blaszki na łokciach i kolanach, z dodatnim wywiadem rodzinnym — łuszczyca zwykła.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Oliwia Zielińska',
    age: 8,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'RIGHT_ARM',
    imageFile: 'case-39.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne oraz wywiad potwierdzają atopowe zapalenie skóry — nie stwierdzono cech nadkażenia bakteryjnego.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Astma u matki',
        content: {
          history: 'Matka dziewczynki choruje na astmę.',
        },
      },
      {
        type: 'FAMILY_HISTORY',
        title: 'Alergia u brata',
        content: {
          history: 'Starszy brat ma alergiczny nieżyt nosa.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i lokalizacja zmian',
        content: {
          description:
            'W zgięciach łokciowych i na nadgarstkach nawracające, silnie swędzące, suche i zaczerwienione zmiany skórne, nasilające się zimą.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Drapanie się przez sen',
        content: {
          description: 'Dziewczynka często drapie się przez sen.',
        },
      },
    ],
    diagnosisCode: 'atopic-dermatitis',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 1,
    resultExplanationText:
      'Nawracające, swędzące, suche zmiany w zgięciach łokciowych u dziecka z rodzinną historią atopii — atopowe zapalenie skóry.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Bartosz Kubiak',
    age: 27,
    sex: 'MALE',
    occupation: 'Jubiler',
    bodyRegion: 'LEFT_HAND',
    imageFile: 'case-40.png',
    examinationSku: 'exam-patch-test',
    examinationFindings: 'Test płatkowy wykazuje wyraźnie dodatnią reakcję na nikiel.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Matka pacjenta ma alergię kontaktową na niklu podobnego pochodzenia.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i lokalizacja wysypki',
        content: {
          description:
            'Na palcu lewej dłoni, dokładnie w miejscu noszenia obrączki, pojawiła się swędząca, zaczerwieniona i lekko sącząca się wysypka.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Związek z noszeniem biżuterii',
        content: {
          description: 'Objawy ustępują po zdjęciu biżuterii, ale nawracają po ponownym założeniu.',
        },
      },
    ],
    diagnosisCode: 'contact-dermatitis',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 1,
    resultExplanationText:
      'Swędząca wysypka ograniczona do miejsca kontaktu z biżuterią, z dodatnim testem płatkowym na nikiel — alergiczne kontaktowe zapalenie skóry.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Iwona Szymczak',
    age: 47,
    sex: 'FEMALE',
    occupation: 'Kelnerka',
    bodyRegion: 'HEAD',
    imageFile: 'case-41.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne wykazuje przewlekły rumień oraz liczne teleangiektazje na środkowej części twarzy, bez zaskórników — obraz typowy dla trądziku różowatego.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Matka pacjentki miała podobne zaczerwienienie twarzy w tym samym wieku.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przewlekłe zaczerwienienie i czynniki nasilające',
        content: {
          description:
            'Od kilku lat utrzymuje się uporczywe zaczerwienienie policzków i nosa, nasilające się po spożyciu alkoholu, ostrych potraw lub w gorących pomieszczeniach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nowe grudki',
        content: {
          description: 'Ostatnio pojawiły się drobne czerwone grudki.',
        },
      },
    ],
    diagnosisCode: 'rosacea',
    treatmentCode: 'topical-antibiotic',
    difficulty: 1,
    resultExplanationText:
      'Przewlekłe zaczerwienienie środkowej części twarzy z teleangiektazjami, nasilające się po alkoholu i ostrych potrawach — trądzik różowaty.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Kamil Górski',
    age: 19,
    sex: 'MALE',
    occupation: 'Student',
    bodyRegion: 'CHEST',
    imageFile: 'case-42.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne wykazuje liczne zaskórniki, grudki i krosty w obrębie twarzy i klatki piersiowej, bez cech nadkażenia.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Ojciec pacjenta miał w młodości nasilony trądzik leczony izotretynoiną.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg trądziku od dojrzewania',
        content: {
          description: 'Od okresu dojrzewania utrzymuje się trądzik na twarzy i plecach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nasilenie w ostatnich miesiącach',
        content: {
          description: 'W ostatnich miesiącach trądzik jest nasilony, z bolesnymi, głębokimi zmianami pozostawiającymi blizny.',
        },
      },
    ],
    diagnosisCode: 'acne-vulgaris',
    treatmentCode: 'oral-isotretinoin',
    difficulty: 2,
    resultExplanationText:
      'Nasilony, bliznowaciejący trądzik oporny na leczenie miejscowe — trądzik pospolity kwalifikujący się do doustnej izotretynoiny.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Renata Wójcik',
    age: 52,
    sex: 'FEMALE',
    occupation: 'Farmaceutka',
    bodyRegion: 'LEFT_HAND',
    imageFile: 'case-43.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings: 'Badanie kliniczne oraz biopsja wycinkowa potwierdzają liszaj płaski.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: {
          history: 'Wirusowe zapalenie wątroby typu C rozpoznane pięć lat wcześniej, obecnie w trakcie leczenia.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd grudek',
        content: {
          description:
            'Na wewnętrznej stronie obu nadgarstków pojawiły się płaskie, fioletowe, silnie swędzące grudki o wielobocznym kształcie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wzór na powierzchni grudek',
        content: {
          description: 'Na powierzchni grudek widoczny jest delikatny białawy siateczkowaty wzór.',
        },
      },
    ],
    diagnosisCode: 'lichen-planus',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 2,
    resultExplanationText:
      'Płaskie, fioletowe, wieloboczne grudki z siateczkowatym wzorem na nadgarstkach — liszaj płaski.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Damian Piotrowski',
    age: 24,
    sex: 'MALE',
    occupation: 'Barista',
    bodyRegion: 'CHEST',
    imageFile: 'case-44.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne w trakcie epizodu potwierdza obrzękowe, silnie swędzące bąble pokrzywkowe ustępujące bez pozostawiania śladu w ciągu 24 godzin.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Stan zdrowia ogólny',
        content: {
          history: 'Wcześniej zdrowy.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Alergie pokarmowe w wywiadzie',
        content: {
          history: 'Nie zgłaszał alergii pokarmowych w przeszłości.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i lokalizacja bąbli',
        content: {
          description:
            'Od kilku dni po spożyciu owoców morza pojawiają się nagle swędzące, czerwone bąble na klatce piersiowej i ramionach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg pojedynczego bąbla',
        content: {
          description: 'Każdy z nich znika w ciągu doby.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nawroty w nowych miejscach',
        content: {
          description: 'Pojawiają się nowe w innych miejscach.',
        },
      },
    ],
    diagnosisCode: 'urticaria',
    treatmentCode: 'oral-antihistamine',
    difficulty: 1,
    resultExplanationText:
      'Nawracające, swędzące bąble ustępujące w ciągu 24 godzin, związane ze spożyciem owoców morza — pokrzywka, leczona doustnym lekiem przeciwhistaminowym.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Natalia Kwaśniewska',
    age: 31,
    sex: 'FEMALE',
    occupation: 'Ogrodniczka',
    bodyRegion: 'HEAD',
    imageFile: 'case-45.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie trichoskopowe (dermoskopia skóry głowy) wykazuje włosy w kształcie wykrzyknika na obwodzie ogniska łysienia — obraz typowy dla łysienia plackowatego.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: { history: 'Matka pacjentki choruje na chorobę Hashimoto.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pojawienie się ogniska łysienia',
        content: {
          description:
            'Trzy tygodnie temu zauważyła nagłe pojawienie się okrągłego, całkowicie łysego ogniska na skórze głowy wielkości monety.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd skóry w obrębie ogniska',
        content: {
          description: 'Skóra w tym miejscu jest gładka, bez zaczerwienienia czy łuszczenia.',
        },
      },
    ],
    diagnosisCode: 'alopecia-areata',
    treatmentCode: 'oral-corticosteroid',
    difficulty: 2,
    resultExplanationText:
      'Nagłe, okrągłe ognisko całkowitej utraty włosów bez zmian zapalnych skóry, z włosami w kształcie wykrzyknika w trichoskopii — łysienie plackowate.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Łukasz Adamczyk',
    age: 22,
    sex: 'MALE',
    occupation: 'Trener personalny',
    bodyRegion: 'RIGHT_ARM',
    imageFile: 'case-46.png',
    examinationSku: 'exam-skin-scraping-koh',
    examinationFindings: 'Preparat bezpośredni z zeskrobin naskórka w KOH potwierdza obecność strzępek grzyba.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Stan zdrowia ogólny',
        content: {
          history: 'Ogólnie zdrowy.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Aktywność sportowa',
        content: {
          history: 'Aktywny sportowo.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Schorzenia skóry w wywiadzie',
        content: {
          history: 'Bez przewlekłych schorzeń skóry.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i lokalizacja zmiany',
        content: {
          description:
            'Na przedramieniu pojawiła się swędząca, czerwona zmiana o kształcie pierścienia, z wyraźnie bardziej aktywnym, łuszczącym się brzegiem i jaśniejszym środkiem.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Ekspozycja w siłowni',
        content: {
          description:
            'Trenuje na macie w siłowni, gdzie podobne zmiany miało kilku innych klientów.',
        },
      },
    ],
    diagnosisCode: 'tinea-corporis',
    treatmentCode: 'topical-antifungal',
    difficulty: 1,
    resultExplanationText:
      'Pierścieniowata, swędząca zmiana z aktywnym brzegiem i jaśniejszym środkiem, potwierdzona badaniem KOH — grzybica skóry gładkiej.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Zuzanna Nowicka',
    age: 6,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'HEAD',
    imageFile: 'case-47.png',
    examinationSku: 'exam-bacterial-culture',
    examinationFindings: 'Posiew bakteryjny z wymazu potwierdza zakażenie gronkowcem złocistym.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Starszy brat miał podobne zmiany skórne w zeszłym miesiącu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pojawienie się pęcherzyków',
        content: {
          description: 'Wokół ust i nosa dziewczynki pojawiły się pęcherzyki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pękanie pęcherzyków',
        content: {
          description: 'Pęcherzyki szybko pękły, pozostawiając miodowo-żółte strupy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Rozprzestrzenianie się zmian',
        content: {
          description:
            'Zmiany szybko rozprzestrzeniły się po tym, jak dotykała ich rękami w przedszkolu.',
        },
      },
    ],
    diagnosisCode: 'impetigo',
    treatmentCode: 'topical-antibiotic',
    difficulty: 1,
    resultExplanationText:
      'Miodowo-żółte strupy wokół ust powstałe po pęknięciu pęcherzyków, potwierdzone posiewem gronkowca złocistego — liszajec zakaźny.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Henryk Kaźmierczak',
    age: 74,
    sex: 'MALE',
    occupation: 'Emeryt',
    bodyRegion: 'RIGHT_LEG',
    imageFile: 'case-48.png',
    examinationSku: 'exam-bacterial-culture',
    examinationFindings:
      'Podwyższone parametry stanu zapalnego oraz posiew z powierzchni skóry potwierdzają bakteryjne zakażenie tkanki podskórnej.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Cukrzyca',
        content: { history: 'Cukrzyca typu II.' },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Niewydolność żylna',
        content: { history: 'Przewlekła niewydolność żylna kończyn dolnych.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmiany',
        content: {
          description:
            'Od dwóch dni prawa goleń jest gorąca, bolesna, wyraźnie zaczerwieniona i obrzęknięta, z niewyraźną granicą zmiany.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Objawy ogólne',
        content: {
          description: 'Towarzyszy temu gorączka i dreszcze.',
        },
      },
    ],
    diagnosisCode: 'cellulitis',
    treatmentCode: 'oral-antibiotic',
    difficulty: 2,
    resultExplanationText:
      'Gorąca, bolesna, rozlana czerwień i obrzęk goleni z towarzyszącą gorączką u pacjenta z cukrzycą — zapalenie tkanki podskórnej, leczone antybiotykiem doustnym.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Antoni Zawadzki',
    age: 4,
    sex: 'MALE',
    occupation: null,
    bodyRegion: 'ABDOMEN',
    imageFile: 'case-49.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne w powiększeniu dermoskopowym potwierdza perłowe grudki z centralnym zagłębieniem, typowe dla mięczaka zakaźnego.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Rozpoznanie choroby skóry',
        content: {
          history: 'Atopowe zapalenie skóry rozpoznano w niemowlęctwie.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Aktualny stan choroby',
        content: {
          history: 'Obecnie jest łagodnie kontrolowane.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd grudek',
        content: {
          description:
            'Na brzuchu chłopca pojawiło się kilkanaście małych, perłowych, gładkich grudek z charakterystycznym wgłębieniem pośrodku.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Podobny przypadek u kolegi',
        content: {
          description: 'Podobne zmiany miał kolega z basenu.',
        },
      },
    ],
    diagnosisCode: 'molluscum-contagiosum',
    treatmentCode: 'watchful-waiting',
    difficulty: 1,
    resultExplanationText:
      'Liczne perłowe grudki z centralnym wgłębieniem u dziecka po kontakcie na basenie — mięczak zakaźny, ustępujący samoistnie, leczony obserwacją.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Filip Urbański',
    age: 15,
    sex: 'MALE',
    occupation: 'Uczeń',
    bodyRegion: 'LEFT_HAND',
    imageFile: 'case-50.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje charakterystyczne czarne kropki (zakrzepłe naczynia) w obrębie szorstkiej, hiperkeratotycznej zmiany — obraz typowy dla brodawki zwykłej.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Stan zdrowia',
        content: {
          history: 'Ogólnie zdrowy.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Aktywność rekreacyjna',
        content: {
          history: 'Regularnie korzysta z basenu szkolnego.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd narośli',
        content: {
          description:
            'Na knykciu lewej dłoni od kilku miesięcy rośnie szorstka, twarda narośl przypominająca kalafior.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Krwawienie narośli',
        content: {
          description: 'Czasami lekko krwawi po otarciu.',
        },
      },
    ],
    diagnosisCode: 'verruca-vulgaris',
    treatmentCode: 'cryotherapy',
    difficulty: 1,
    resultExplanationText:
      'Szorstka, kalafiorowata narośl z czarnymi kropkami zakrzepłych naczyń w dermoskopii — brodawka zwykła, leczona krioterapią.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Czesław Wrzesień',
    age: 71,
    sex: 'MALE',
    occupation: 'Emeryt',
    bodyRegion: 'BACK',
    imageFile: 'case-51.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia potwierdza obraz "przyklejonej", woskowatej narośli z czopami rogowymi — łagodne rogowacenie łojotokowe.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Ogólny stan zdrowia',
        content: {
          history: 'Ogólnie zdrowy jak na swój wiek.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia nowotworów skóry',
        content: {
          history: 'Nie miał wcześniej nowotworów skóry.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i lokalizacja zmian',
        content: {
          description:
            'Na plecach i klatce piersiowej ma liczne, brązowe do czarnych, woskowate narośle o różnej wielkości.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg zmian',
        content: {
          description: 'Zmiany są obecne od wielu lat i powoli ich przybywa.',
        },
      },
    ],
    diagnosisCode: 'seborrheic-keratosis',
    treatmentCode: 'cryotherapy',
    difficulty: 1,
    resultExplanationText:
      'Liczne, woskowate, "przyklejone" narośle przybywające od lat — rozległe rogowacenie łojotokowe, usunięte krioterapią ze względów kosmetycznych.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Amelia Dąbrowska',
    age: 16,
    sex: 'FEMALE',
    occupation: 'Uczennica',
    bodyRegion: 'RIGHT_ARM',
    imageFile: 'case-52.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje regularną, jednorodną strukturę barwnikową bez cech niepokojących.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Matka pacjentki ma liczne znamiona o podobnym wyglądzie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd znamienia',
        content: {
          description: 'Od dzieciństwa ma niewielkie, gładkie, symetryczne znamię na ramieniu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg znamienia',
        content: {
          description: 'Znamię rosło proporcjonalnie wraz z nią, bez zmian koloru czy kształtu.',
        },
      },
    ],
    diagnosisCode: 'common-nevus',
    treatmentCode: 'no-treatment',
    difficulty: 1,
    resultExplanationText:
      'Stabilne, symetryczne znamię rosnące proporcjonalnie do wieku pacjentki — zwykłe znamię melanocytowe, niewymagające leczenia.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Bogdan Sadecki',
    age: 55,
    sex: 'MALE',
    occupation: 'Taksówkarz',
    bodyRegion: 'RIGHT_LEG',
    imageFile: 'case-53.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne potwierdza srebrzyste blaszki z objawem Auspitza (punktowe krwawienie po zdrapaniu łuski).',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Bóle stawów',
        content: {
          history: 'Przewlekłe bóle stawów kolanowych od kilku lat.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Dotychczasowe wyjaśnienie bólu',
        content: {
          history: 'Ból ten dotąd wiązano wyłącznie z wiekiem.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i lokalizacja zmian',
        content: {
          description:
            'Na obu goleniach oraz owłosionej skórze głowy nawracają grube, srebrzyste blaszki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zaostrzenie po infekcji',
        content: {
          description: 'Blaszki nasiliły się po niedawnej infekcji gardła.',
        },
      },
    ],
    diagnosisCode: 'psoriasis',
    treatmentCode: 'phototherapy-uvb',
    difficulty: 2,
    resultExplanationText:
      'Rozległe, srebrzyste blaszki z dodatnim objawem Auspitza, zaostrzone po infekcji gardła — łuszczyca, leczona fototerapią UVB.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Marta Kowal',
    age: 38,
    sex: 'FEMALE',
    occupation: 'Kosmetyczka',
    bodyRegion: 'HEAD',
    imageFile: 'case-54.png',
    examinationSku: 'exam-patch-test',
    examinationFindings: 'Test płatkowy wykazuje dodatnią reakcję na składnik zawarty w nowym kremie do twarzy.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: {
          history: 'Wcześniej nie zgłaszała żadnych alergii kontaktowych ani skórnych.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zaczerwienienie',
        content: {
          description:
            'Dwa dni po użyciu nowego kremu nawilżającego na twarzy pojawiło się silne zaczerwienienie dokładnie w miejscu aplikacji.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pieczenie',
        content: {
          description: 'Towarzyszyło temu pieczenie w miejscu aplikacji kremu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pęcherzyki',
        content: {
          description: 'Pojawiły się także drobne pęcherzyki dokładnie w miejscu aplikacji kremu.',
        },
      },
    ],
    diagnosisCode: 'contact-dermatitis',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 1,
    resultExplanationText:
      'Ostra reakcja skórna ograniczona do miejsca aplikacji nowego kosmetyku, potwierdzona dodatnim testem płatkowym — alergiczne kontaktowe zapalenie skóry.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Wiesław Domański',
    age: 50,
    sex: 'MALE',
    occupation: 'Prawnik',
    bodyRegion: 'HEAD',
    imageFile: 'case-55.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Badanie kliniczne wykazuje przetrwały rumień, teleangiektazje oraz przerost tkanki nosa.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Spożycie alkoholu',
        content: {
          history: 'Regularnie spożywa alkohol w towarzystwie zawodowym.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Ogólny stan zdrowia',
        content: {
          history: 'Poza tym jest ogólnie zdrowy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd nosa',
        content: {
          description:
            'Od lat ma czerwony, stopniowo powiększający się i pogrubiały nos, z widocznymi drobnymi naczynkami.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Stan skóry',
        content: {
          description: 'Skóra w tym miejscu jest nierówna i lekko obrzęknięta.',
        },
      },
    ],
    diagnosisCode: 'rosacea',
    treatmentCode: 'oral-antibiotic',
    difficulty: 2,
    resultExplanationText:
      'Przewlekłe zaczerwienienie i przerost tkanki nosa z widocznymi naczynkami — zaawansowany trądzik różowaty z cechami rhinophyma, leczony antybiotykiem doustnym.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Emilia Stępień',
    age: 44,
    sex: 'FEMALE',
    occupation: 'Architektka',
    bodyRegion: 'BACK',
    imageFile: 'case-56.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Dermoskopia wykazuje asymetryczną strukturę, nieregularną sieć barwnikową i obszary regresji — cechy silnie niepokojące; biopsja potwierdza czerniaka.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Opalanie w porze szczytowej',
        content: {
          history:
            'Przez wiele lat regularnie korzystała z opalania na tarasie w porze największego nasłonecznienia.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Brak ochrony przeciwsłonecznej',
        content: {
          history: 'Nie stosowała przy tym filtrów przeciwsłonecznych.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zauważenie zmiany',
        content: {
          description: 'Znamię na plecach zauważył mąż podczas wakacji.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zmiana koloru',
        content: {
          description:
            'W ciągu kilku miesięcy znamię zmieniło kolor na ciemniejszy i nierównomierny.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zmiana brzegów',
        content: {
          description: 'Jego brzegi stały się postrzępione.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Asymetryczne, nierównomiernie zabarwione, szybko zmieniające się znamię z obszarami regresji w dermoskopii — czerniak, leczony wycięciem chirurgicznym.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Stanisław Górecki',
    age: 66,
    sex: 'MALE',
    occupation: 'Listonosz',
    bodyRegion: 'HEAD',
    imageFile: 'case-57.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje typowe struktury liściowate oraz teleangiektazje w obrębie perłowego guzka — obraz typowy dla raka podstawnokomórkowego.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Codzienna ekspozycja na słońce',
        content: {
          history: 'Przez 35 lat pracy jako listonosz codziennie spędzał kilka godzin na słońcu.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Brak nakrycia głowy',
        content: {
          history: 'Rzadko nosił przy tym nakrycie głowy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmiany',
        content: {
          description:
            'Na czole ma niewielki, perłowy guzek z widocznymi drobnymi naczynkami na powierzchni.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg zmiany',
        content: {
          description: 'Guzek jest obecny od ponad roku i powoli się powiększa.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Krwawienie zmiany',
        content: {
          description: 'Czasem lekko krwawi.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 1,
    resultExplanationText:
      'Perłowy guzek z teleangiektazjami na czole u wieloletniego listonosza — rak podstawnokomórkowy, leczony wycięciem chirurgicznym.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Krystian Wysocki',
    age: 59,
    sex: 'MALE',
    occupation: 'Dekarz',
    bodyRegion: 'HEAD',
    imageFile: 'case-58.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings: 'Biopsja wycinkowa potwierdza inwazyjnego raka kolczystokomórkowego.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Wieloletnia praca na dachach',
        content: { history: 'Ponad 30 lat pracy jako dekarz na dachach.' },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Minimalna ochrona przeciwsłoneczna',
        content: { history: 'Miał przy tym minimalną ochronę przeciwsłoneczną.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmiany',
        content: {
          description: 'Na małżowinie usznej ma twardą, łuszczącą się, owrzodziałą zmianę.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powiększanie się zmiany',
        content: {
          description: 'Zmiana od kilku miesięcy stopniowo się powiększa.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Krwawienie zmiany',
        content: {
          description: 'Czasami krwawi.',
        },
      },
    ],
    diagnosisCode: 'squamous-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Twarda, owrzodziała, powiększająca się zmiana na uchu u wieloletniego dekarza — rak kolczystokomórkowy, leczony wycięciem chirurgicznym.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Aleksandra Michalska',
    age: 30,
    sex: 'FEMALE',
    occupation: 'Fotografka',
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-59.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje nieregularną sieć barwnikową oraz niejednorodne rozmieszczenie kolorów — cechy atypowe, niejednoznaczne, kwalifikujące do usunięcia.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Ciotka pacjentki miała usuwane atypowe znamiona kilkukrotnie w przeszłości.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Rozmiar znamienia',
        content: {
          description: 'Na ramieniu ma znamię większe od pozostałych.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Kolor i brzegi znamienia',
        content: {
          description: 'Znamię ma niejednolity, plamisty kolor i lekko nieregularne brzegi.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Stabilność znamienia',
        content: {
          description: 'Znamię jest obecne od kilku lat, bez wyraźnych zmian w ostatnim czasie.',
        },
      },
    ],
    diagnosisCode: 'dysplastic-nevus',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Większe, niejednolicie zabarwione znamię o nieregularnych brzegach u pacjentki z rodzinną historią atypowych znamion — znamię dysplastyczne, usunięte profilaktycznie.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Zdzisław Karolak',
    age: 77,
    sex: 'MALE',
    occupation: 'Emeryt',
    bodyRegion: 'HEAD',
    imageFile: 'case-60.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje szorstką, rumieniową powierzchnię z delikatnym złuszczaniem, bez cech naciekania — obraz typowy dla rogowacenia słonecznego.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Praca na roli',
        content: { history: 'Całe życie spędził pracując na roli.' },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Brak nakrycia głowy',
        content: { history: 'Rzadko nosił przy tym kapelusz.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Lokalizacja i liczba zmian',
        content: {
          description: 'Na łysiejącej skórze głowy ma kilka szorstkich, czerwonawych plam.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Faktura zmian',
        content: {
          description: 'Plamy mają papierową fakturę i są wyczuwalne bardziej niż widoczne.',
        },
      },
    ],
    diagnosisCode: 'actinic-keratosis',
    treatmentCode: 'cryotherapy',
    difficulty: 1,
    resultExplanationText:
      'Szorstkie, rumieniowe plamy o papierowej fakturze na przewlekle eksponowanej na słońce skórze głowy — rogowacenie słoneczne, leczone krioterapią.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
  {
    patientName: 'Patrycja Olejnik',
    age: 13,
    sex: 'FEMALE',
    occupation: 'Uczennica',
    bodyRegion: 'RIGHT_LEG',
    imageFile: 'case-61.png',
    examinationSku: 'exam-skin-scraping-koh',
    examinationFindings: 'Preparat bezpośredni z zeskrobin naskórka w KOH potwierdza obecność strzępek grzybni.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia brata',
        content: {
          history: 'Starszy brat miał podobną zmianę skórną rok wcześniej.',
        },
      },
      {
        type: 'FAMILY_HISTORY',
        title: 'Wynik leczenia brata',
        content: {
          history: 'Zmiana u brata ustąpiła po leczeniu maścią przeciwgrzybiczą.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmiany',
        content: {
          description:
            'Na łydce pojawiła się swędząca, czerwona, pierścieniowata zmiana z wyraźnym, uniesionym brzegiem.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Kontakt z kotem',
        content: {
          description: 'Zmiana pojawiła się po tym, jak głaskała kota sąsiadów.',
        },
      },
    ],
    diagnosisCode: 'tinea-corporis',
    treatmentCode: 'topical-antifungal',
    difficulty: 1,
    resultExplanationText:
      'Swędząca, pierścieniowata zmiana z uniesionym brzegiem po kontakcie z kotem, potwierdzona badaniem KOH — grzybica skóry gładkiej.',
    sourceNote:
      'Fikcyjny przypadek w całości wymyślony na potrzeby urozmaicenia rozgrywki — nieoparty na żadnym rzeczywistym raporcie medycznym.',
  },
];
