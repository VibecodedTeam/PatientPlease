export type Sex = 'MALE' | 'FEMALE' | 'OTHER';

export type BodyRegion =
  | 'HEAD'
  | 'NECK'
  | 'CHEST'
  | 'BACK'
  | 'ABDOMEN'
  | 'LEFT_ARM'
  | 'RIGHT_ARM'
  | 'LEFT_LEG'
  | 'RIGHT_LEG'
  | 'LEFT_HAND'
  | 'RIGHT_HAND'
  | 'LEFT_FOOT'
  | 'RIGHT_FOOT'
  | 'OTHER';

export type SupportingDocumentType =
  | 'DISEASE_HISTORY'
  | 'UV_EXPOSURE_HISTORY'
  | 'CLINICAL_SYMPTOMS'
  | 'FAMILY_HISTORY'
  | 'WEATHER_HISTORY';

export type RealCaseDocument = {
  type: SupportingDocumentType;
  title: string;
  content: Record<string, unknown> | null;
};

export type RealCaseSeed = {
  patientName: string;
  age: number;
  sex: Sex;
  occupation: string | null;
  bodyRegion: BodyRegion;
  imageFile: string;
  examinationSku: string;
  examinationFindings: string;
  documents: RealCaseDocument[];
  diagnosisCode: string;
  treatmentCode: string | null;
  difficulty: 1 | 2 | 3;
  resultExplanationText: string;
  sourceNote: string | null;
  /** 1-based position among the first cases a new session sees, ascending. Omitted for the
   * ~46 non-featured cases, which fall back to the existing difficulty-tiered random selection. */
  featuredOrder?: number;
};

export const REAL_CASES: RealCaseSeed[] = [
  {
    patientName: 'Dariusz Wilk',
    age: 36,
    sex: 'MALE',
    occupation: 'Księgowy',
    bodyRegion: 'NECK',
    imageFile: 'case-01.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja masy podżuchwowej potwierdza pierwotnego czerniaka — bardzo rzadką postać wywodzącą się z okolicy gruczołu podżuchwowego.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: { history: 'Brak istotnych problemów zdrowotnych w przeszłości.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zgrubienia',
        content: {
          description:
            'Postępujące, niebolesne, twarde zgrubienie po lewej dolnej stronie twarzy w okolicy żuchwy, stopniowo powiększające się przez kilka tygodni.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Brak dodatkowych dolegliwości',
        content: {
          description:
            'Brak dolegliwości podczas jedzenia czy mówienia, bez wcześniejszego urazu lub infekcji w tej okolicy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Asymetria twarzy',
        content: {
          description: 'Twarz stała się widocznie asymetryczna z powodu obrzęku.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    featuredOrder: 1,
    resultExplanationText:
      'Rzadki pierwotny czerniak okolicy gruczołu podżuchwowego, wymagający całkowitej resekcji chirurgicznej i rekonstrukcji żuchwy.',
    sourceNote: null,
  },
  {
    patientName: 'Barbara Sikora',
    age: 45,
    sex: 'FEMALE',
    occupation: 'Kierowniczka ds. marketingu',
    bodyRegion: 'CHEST',
    imageFile: 'case-02.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia wykazuje symetryczną strukturę i regularną, jednolitą pigmentację — typowy obraz łagodnego znamienia melanocytowego, bez cech niepokojących.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia ekspozycji na promieniowanie UV',
        content: {
          history:
            'Niedawny, intensywnie słoneczny urlop na Maderze skłonił ją do przyjrzenia się swoim znamionom.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nowo zauważone znamię',
        content: {
          description:
            'Po powrocie z urlopu na Maderze zauważyła znamię nad lewym obojczykiem, którego wcześniej nie zauważyła.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Cechy i stabilność znamienia',
        content: {
          description:
            'Ma równe brzegi, jednolity brązowy kolor i nie zmieniła się w ciągu miesiąca obserwacji — dermoskopia nie wykazuje żadnej ewolucji.',
        },
      },
    ],
    diagnosisCode: 'common-nevus',
    treatmentCode: 'watchful-waiting',
    difficulty: 1,
    featuredOrder: 2,
    resultExplanationText:
      'Symetryczne, jednolicie zabarwione znamię nad obojczykiem, niezmienione w miesięcznej obserwacji — zwykłe znamię melanocytowe, niewymagające interwencji.',
    sourceNote:
      'Zmodyfikowany wariant fabularny — pierwotny raport dotyczył czerniaka; tutaj zmiana zaadaptowana na zwykłe znamię w celu urozmaicenia rozkładu diagnoz.',
  },
  {
    patientName: 'Kamil Zych',
    age: 34,
    sex: 'MALE',
    occupation: 'Tatuażysta',
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-03.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja zmienionego pigmentu tatuażu potwierdza czerniaka rozwijającego się w obrębie wytatuowanej skóry — rzadkie, ale znane zjawisko.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: {
          history:
            'Ogólnie zdrowy, bez istotnych chorób przewlekłych ani wcześniejszych nowotworów skóry.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zmiana w obrębie tatuażu',
        content: {
          description:
            'Fragment starego tatuażu na lewym ramieniu — wcześniej jednolity, ciemny i wyraźnie odgraniczony — rozwinął nieregularną, ciemniejszą plamę, w miejscu której pigment wydaje się rozprzestrzeniać.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powiększanie i uniesienie',
        content: {
          description:
            'Obszar stopniowo się powiększał i lekko uniósł, jakby coś gromadziło się pod skórą.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Brak bólu, ale widoczna różnica',
        content: {
          description:
            'Bez bólu i swędzenia, ale obszar wyraźnie różni się wyglądem od reszty tatuażu i wyraźnie się powiększa.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    featuredOrder: 3,
    resultExplanationText:
      'Czerniak rozwijający się w obrębie wytatuowanej skóry — rzadka, lecz udokumentowana postać, w której guz można pomylić ze zmianami pigmentu tatuażu.',
    sourceNote: null,
  },
  {
    patientName: 'Bogumiła Nowicka',
    age: 45,
    sex: 'FEMALE',
    occupation: 'Krawcowa',
    bodyRegion: 'ABDOMEN',
    imageFile: 'case-04.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja potwierdza włókniaka twardego (dermatofibroma) — łagodną zmianę tkanki łącznej, bez cech złośliwości.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Znamiona i ogólny stan zdrowia',
        content: {
          history:
            'Ma liczne znamiona odkąd pamięta, ale nigdy nie sprawiały problemów, a poza tym zawsze była zdrowa.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Drobne urazy przy pracy',
        content: {
          history: 'Przy pracy z igłami i szpilkami zdarzają jej się drobne ukłucia i skaleczenia.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd guzka',
        content: {
          description:
            'Twardy, brązowawy guzek po prawej stronie brzucha, obecny od dzieciństwa po drobnym skaleczeniu przy pracy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Charakterystyczny objaw wciągania',
        content: {
          description: 'Charakterystycznie wciąga się do wewnątrz przy ściśnięciu z boków.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Stabilność i badanie węzłów',
        content: {
          description: 'Nie powiększa się, nie boli, węzły chłonne pachwinowe są niewyczuwalne.',
        },
      },
    ],
    diagnosisCode: 'dermatofibroma',
    treatmentCode: 'no-treatment',
    difficulty: 1,
    featuredOrder: 4,
    resultExplanationText:
      'Twardy guzek wciągający się przy ucisku, powstały po drobnym urazie przy pracy z igłami — klasyczny obraz włókniaka twardego, zmiany łagodnej.',
    sourceNote:
      'Zmodyfikowany wariant fabularny — pierwotny raport dotyczył czerniaka; tutaj zmiana zaadaptowana na włókniaka twardego w celu urozmaicenia rozkładu diagnoz.',
  },
  {
    patientName: 'Wanda Kaczmarek',
    age: 79,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'HEAD',
    imageFile: 'case-05.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja wykazuje komórki barwnikowe SOX-10 dodatnie; wynik potwierdza desmoplastycznego czerniaka błony śluzowej nosa — bardzo rzadką lokalizację czerniaka.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: {
          history: 'Nadciśnienie tętnicze oraz przebyty udar mózgu pięć lat wcześniej.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zgłoszenie do laryngologa',
        content: {
          description:
            'Zgłosiła się do laryngologa z powodu przewlekłego dyskomfortu w nosie i wodnistej wydzieliny, początkowo uznawanych za zwykłe podrażnienie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zmiana w przedsionku nosa',
        content: {
          description: 'Lekarz zauważył niewielką zmianę w przedsionku nosa.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik biopsji',
        content: {
          description: 'Biopsja ujawniła komórki barwnikowe dodatnie pod względem markera SOX-10.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Niebieskawa plamka po biopsji',
        content: {
          description:
            'Po skierowaniu do ośrodka specjalistycznego w miejscu wcześniejszej biopsji pojawiła się niebieskawa plamka.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powiększanie się i usunięcie zmiany',
        content: {
          description:
            'Mimo braku innych objawów zmianę usunięto z powodu stopniowego powiększania się i wynikającej z tego asymetrii nosa.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    featuredOrder: 5,
    resultExplanationText:
      'Rzadki desmoplastyczny czerniak błony śluzowej nosa, wykryty przypadkowo podczas diagnostyki przewlekłych objawów nosowych.',
    sourceNote: null,
  },
  {
    patientName: 'Zenon Lis',
    age: 70,
    sex: 'MALE',
    occupation: 'Emeryt',
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-06.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Badanie kliniczne i biopsja potwierdzają srebrzyste, dobrze odgraniczone blaszki typowe dla łuszczycy zwykłej, bez cech złośliwości.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Choroby przewlekłe',
        content: {
          history: 'Długa historia cukrzycy typu II, nadciśnienia tętniczego i miażdżycy.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Wywiad rodzinny w zakresie łuszczycy',
        content: {
          history: 'Ojciec pacjenta chorował na łuszczycę przez całe dorosłe życie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmian skórnych',
        content: {
          description:
            'Na lewym ramieniu i łokciu od kilku lat nawracają grube, srebrzyście łuszczące się, czerwone blaszki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Czynniki zaostrzające',
        content: {
          description:
            'Objawy nasilają się zimą i w okresach stresu, a niedawny zabieg kardiologiczny zaostrzył ich przebieg.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Stan znamion',
        content: {
          description: 'Żadne znamiona pacjenta nie zmieniły kształtu ani koloru.',
        },
      },
    ],
    diagnosisCode: 'psoriasis',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 1,
    featuredOrder: 6,
    resultExplanationText:
      'Nawracające, srebrzyście łuszczące się czerwone blaszki na ramieniu i łokciu, z dodatnim wywiadem rodzinnym — łuszczyca zwykła.',
    sourceNote:
      'Zmodyfikowany wariant fabularny — pierwotny raport dotyczył czerniaka; tutaj zmiana zaadaptowana na łuszczycę w celu urozmaicenia rozkładu diagnoz.',
  },
  {
    patientName: 'Józef Baran',
    age: 55,
    sex: 'MALE',
    occupation: 'Inżynier budownictwa',
    bodyRegion: 'NECK',
    imageFile: 'case-07.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia i pełna ocena ABCDE silnie sugerują czerniaka, biorąc pod uwagę asymetrię, nieregularne brzegi, zróżnicowanie koloru, rozmiar i ewolucję zmiany.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Stosowanie ochrony przeciwsłonecznej',
        content: {
          history:
            'Rzadko stosuje krem z filtrem, tłumacząc to przyzwyczajeniem oraz praktycznymi wymogami pracy budowlanej na zewnątrz.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Oparzenia słoneczne w dzieciństwie',
        content: {
          history: 'W dzieciństwie miał liczne poważne oparzenia słoneczne.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Liczne znamiona',
        content: {
          history: 'Ma wiele pigmentowanych znamion.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zmiana znamienia w czasie',
        content: {
          description:
            'Znamię z tyłu szyi zmieniło kształt, powiększyło się i zmieniło kolor w ciągu około 6 miesięcy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Kryteria ABCDE',
        content: {
          description:
            'Badanie skóry wykazało zmianę o wymiarach 9 mm x 7 mm spełniającą kryteria ABCDE: asymetryczna, postrzępione brzegi, niejednorodny kolor (brąz zmieszany z czerwono-różowym), średnica ponad 9 mm oraz ewolucja trwająca ponad 6 miesięcy.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 2,
    featuredOrder: 7,
    resultExplanationText:
      'Zmieniające się znamię na szyi spełniające wszystkie pięć kryteriów ostrzegawczych ABCDE u długoletniego pracownika fizycznego pracującego na zewnątrz, z historią oparzeń słonecznych w dzieciństwie.',
    sourceNote:
      'Diagnosis reflects the ABCDE assessment described in the source; no explicit final diagnosis was stated.',
  },
  {
    patientName: 'Marcin Krupa',
    age: 50,
    sex: 'MALE',
    occupation: 'Robotnik budowlany',
    bodyRegion: 'HEAD',
    imageFile: 'case-08.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia i badanie kliniczne potwierdzają perłowy, teleangiektatyczny guzek typowy dla raka podstawnokomórkowego w I stopniu zaawansowania.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia ekspozycji na promieniowanie UV',
        content: {
          history: 'Dobrze zbudowany, aktywny fizycznie robotnik budowlany o fototypie skóry II.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd zmiany',
        content: {
          description:
            'Półprzezroczysta, perłowa zmiana o średnicy ponad 6 mm i owalnym kształcie od lat obecna na prawym policzku.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Błyszczący wygląd i krwawienie',
        content: {
          description: 'Wygląda błyszcząco, czasem krwawi, ale nigdy go to nie niepokoiło.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powiększanie i swędzenie',
        content: {
          description:
            'Ostatnio zaczęła się powiększać i swędzieć, co skłoniło go do wizyty za namową córki.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'mohs-surgery',
    difficulty: 1,
    featuredOrder: 8,
    resultExplanationText:
      'Klasyczny perłowy, błyszczący guzek na policzku — rak podstawnokomórkowy w I stopniu zaawansowania, leczony chirurgią mikrograficzną Mohsa ze względu na lokalizację na twarzy.',
    sourceNote: null,
  },
  {
    patientName: 'Zofia Wrona',
    age: 68,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'NECK',
    imageFile: 'case-09.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja potwierdza raka kolczystokomórkowego w III stopniu zaawansowania, z zajęciem regionalnych węzłów chłonnych i głębokim naciekaniem sąsiednich mięśni i tkanki nerwowej; badania obrazowe ujawniają także niewielki przerzut do płuc.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: { history: 'Wdowa, mieszka samotnie na działce ogrodniczej, pali papierosy.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zmiany skórne na szyi',
        content: {
          description:
            'Szorstkie, łuszczące się plamy oraz twarde guzki z owrzodzeniem centralnym na szyi, obecne od lat.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Progresja miejscowa',
        content: {
          description:
            'Z czasem zmiany zaczęły boleć pod naciskiem, guzki się powiększyły, a pobliskie węzły chłonne szyi uległy powiększeniu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Objawy ogólnoustrojowe',
        content: {
          description:
            'W ostatnich miesiącach doświadczyła niekontrolowanego spadku wagi i zaczęła utykać na prawą nogę.',
        },
      },
    ],
    diagnosisCode: 'squamous-cell-carcinoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    featuredOrder: 9,
    resultExplanationText:
      'Długotrwałe owrzodziałe, łuszczące się zmiany na szyi przekształciły się w raka kolczystokomórkowego w III stopniu zaawansowania z przerzutami do węzłów chłonnych i płuc, wymagające skierowania onkologicznego celem resekcji, usunięcia węzłów chłonnych i chemioterapii.',
    sourceNote: null,
  },
  {
    patientName: 'Horacjusz Duda',
    age: 40,
    sex: 'MALE',
    occupation: 'Kierowca autobusu',
    bodyRegion: 'HEAD',
    imageFile: 'case-10.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Badanie histopatologiczne potwierdza pierwotnego czerniaka błony śluzowej dziąsła szczęki — rzadką lokalizację czerniaka.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Ogólny stan zdrowia',
        content: {
          history: 'Niepalący, bez istotnych chorób przewlekłych.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Regularne wizyty u dentysty',
        content: {
          history: 'Regularnie odwiedza dentystę.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zauważenie zmiany',
        content: {
          description: 'Zauważył ciemną, pigmentowaną zmianę na górnej dziąśle.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Brak objawów i zwłoka',
        content: {
          description: 'Początkowo niebolesna i bezobjawowa, więc długo była ignorowana.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Charakterystyka i progresja zmiany',
        content: {
          description:
            'Zmiana była dobrze odgraniczona, ciemniejsza niż otaczająca błona śluzowa i stopniowo się powiększała.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    featuredOrder: 10,
    resultExplanationText:
      'Pigmentowana zmiana na dziąśle, długo ignorowana z powodu braku objawów, okazała się rzadkim pierwotnym czerniakiem błony śluzowej jamy ustnej.',
    sourceNote: null,
  },
  {
    patientName: 'Hiacynta Górska',
    age: 69,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'CHEST',
    imageFile: 'case-11.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Badanie histopatologiczne potwierdza czerniaka, najprawdopodobniej późny przerzut czerniaka wyciętego ponad 30 lat wcześniej.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: {
          history:
            'Ponad 30 lat wcześniej chirurgicznie usunięto czerniaka z okolicy lewego mięśnia piersiowego.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Objawy ogólnoustrojowe',
        content: {
          description:
            'Od kilku miesięcy narastający ból w nadbrzuszu, rozwijająca się niedokrwistość i niezamierzona utrata masy ciała.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik badań obrazowych',
        content: {
          description: 'Badania obrazowe ujawniły duży naciek w żołądku.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik operacji',
        content: {
          description:
            'Podczas operacji stwierdzono ciemny, naciekający guz obejmujący dno żołądka.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    featuredOrder: 11,
    resultExplanationText:
      'Guz żołądka pojawiający się dekady po wcześniejszym wycięciu czerniaka okazał się późnym przerzutowym nawrotem tego pierwotnego czerniaka.',
    sourceNote: null,
  },
  {
    patientName: 'Krystyna Sroka',
    age: 57,
    sex: 'FEMALE',
    occupation: 'Agentka turystyczna',
    bodyRegion: 'RIGHT_ARM',
    imageFile: 'case-12.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Test płatkowy wykazuje wyraźnie dodatnią reakcję na nikiel; biopsja wykazuje jedynie zmiany zapalne, bez cech nowotworowych.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Wcześniejsza ekspozycja na Bermudach',
        content: {
          history:
            'Przez wiele lat mieszkała na Bermudach, gdzie była silnie eksponowana na promieniowanie UV, nie zdając sobie wówczas sprawy z wagi ochrony przeciwsłonecznej.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Obecna ostrożność',
        content: {
          history:
            'Od 20. roku życia jest bardziej ostrożna — stosuje kremy z filtrem SPF i unika słońca w gorące, słoneczne dni.',
        },
      },
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history:
            'Jej ojciec chorował na raka skóry, dlatego od kilku lat okresowo kontroluje swoje znamiona.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wysypka po bransoletce',
        content: {
          description:
            'Zgłosiła się z powodu swędzącej, zaczerwienionej wysypki na prawym ramieniu, która pojawiła się po założeniu nowej bransoletki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Stan znamion',
        content: {
          description: 'Dobrze zna swoje znamiona i żadne z nich nie wygląda nietypowo.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Związek z biżuterią',
        content: {
          description: 'Wysypka ustępuje po zdjęciu biżuterii, ale nawraca po ponownym założeniu.',
        },
      },
    ],
    diagnosisCode: 'contact-dermatitis',
    treatmentCode: 'topical-corticosteroid',
    difficulty: 1,
    featuredOrder: 12,
    resultExplanationText:
      'Swędząca wysypka ograniczona do miejsca kontaktu z bransoletką, z dodatnim testem płatkowym na nikiel — alergiczne kontaktowe zapalenie skóry, mimo istotnych czynników ryzyka związanych z UV i historią rodzinną.',
    sourceNote:
      'Zmodyfikowany wariant fabularny — pierwotny raport dotyczył czerniaka; tutaj zmiana zaadaptowana na alergiczne kontaktowe zapalenie skóry w celu urozmaicenia rozkładu diagnoz.',
  },
  {
    patientName: 'Tomasz Ryba',
    age: 38,
    sex: 'MALE',
    occupation: 'Programista',
    bodyRegion: 'BACK',
    imageFile: 'case-13.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Badanie histopatologiczne potwierdza czerniaka guzkowego w II stopniu klinicznego zaawansowania, o grubości Breslowa powyżej 2 mm; wykonano biopsję węzła wartowniczego wraz z szerokim wycięciem.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia ekspozycji na promieniowanie UV',
        content: {
          history:
            'Zapalony wspinacz górski, spędzający urlopy na dużych wysokościach bez odpowiedniej ochrony przed promieniowaniem UV.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nowa zmiana',
        content: {
          description: 'Zauważył nową, szybko rosnącą zmianę na plecach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd guzka',
        content: {
          description:
            'W przeciwieństwie do swoich typowych znamion, prezentowała się jako ciemnoniebieski, twardy, wyraźnie uniesiony guzek.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Szybka progresja',
        content: {
          description:
            'W ciągu zaledwie dwóch miesięcy podwoiła rozmiar, zaczęła swędzieć i czasami krwawiła podczas wycierania się ręcznikiem.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    featuredOrder: 13,
    resultExplanationText:
      'Szybko rosnący, ciemnoniebieski guzek na plecach — czerniak guzkowy w II stopniu zaawansowania, leczony szerokim wycięciem i biopsją węzła wartowniczego.',
    sourceNote: null,
  },
  {
    patientName: 'Kacper Sobczak',
    age: 17,
    sex: 'MALE',
    occupation: 'Uczeń',
    bodyRegion: 'HEAD',
    imageFile: 'case-16.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Wycięcie chirurgiczne i analiza histopatologiczna potwierdzają czerniaka skóry owłosionej głowy.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Babcia ze strony matki chorowała na czerniaka w wieku 60 lat.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zauważenie zmiany przez kolegę',
        content: {
          description: 'Podczas obozu sportowego kolega zauważył nietypową zmianę na jego głowie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd znamienia',
        content: {
          description:
            'Następnego ranka zauważył nieregularne znamię, ciemne i przypominające krwiaka podnaskórkowego.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Brak urazu',
        content: {
          description:
            'Nie pamięta żadnego niedawnego urazu głowy, co właśnie zwróciło jego uwagę na tę zmianę.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Nieregularna, ciemna zmiana na skórze głowy, przypominająca krwiaka podnaskórkowego, bez historii urazu, okazała się w badaniu histopatologicznym czerniakiem.',
    sourceNote:
      'Final diagnosis was not stated in the source text and was generated to complete this case, per user instruction — the presentation (irregular, dark, blood-blister-like lesion, no trauma history) is consistent with melanoma.',
  },
  {
    patientName: 'Halina Wilczek',
    age: 65,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'LEFT_LEG',
    imageFile: 'case-17.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Wycięcie chirurgiczne z odpowiednimi marginesami oraz badanie histopatologiczne potwierdzają średnio zróżnicowanego raka kolczystokomórkowego w stopniu T2. Badanie kliniczne oraz obrazowanie CT/PET nie wykazują zajęcia węzłów chłonnych ani przerzutów.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Karnacja i tolerancja słońca',
        content: {
          history: 'Jasna karnacja, łatwo ulega oparzeniom słonecznym, słabo się opala.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia korzystania z solarium',
        content: {
          history:
            'Przez 40 lat korzystała z solarium co najmniej raz w tygodniu, ale zaprzestała 7 lat temu i od tego czasu unika ekspozycji na słońce.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zgłoszenie z powodu zmiany na kostce',
        content: {
          description:
            'Zgłosiła się do kliniki chirurgii onkologicznej z bolesną, szybko powiększającą się, owrzodziałą zmianą na lewej kostce, obecnie o średnicy 3 cm.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd brzegów zmiany',
        content: {
          description:
            'Zmiana ma nieregularne, uniesione brzegi, które krwawią przy niewielkim urazie.',
        },
      },
    ],
    diagnosisCode: 'squamous-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Bolesna, szybko rosnąca, owrzodziała zmiana na kostce u wieloletniej użytkowniczki solarium — rak kolczystokomórkowy w stopniu T2, bez zajęcia węzłów chłonnych.',
    sourceNote: null,
  },
  {
    patientName: 'Grażyna Sowa',
    age: 65,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-18.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia, biopsja i badanie histopatologiczne potwierdzają rogowacenie słoneczne — zmianę przednowotworową, nie nowotwór.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Wcześniejszy czerniak skóry twarzy',
        content: {
          history: 'Wcześniej leczona z powodu czerniaka skóry twarzy.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Wywiad rodzinny w kierunku raka skóry',
        content: {
          history: 'Brak rodzinnej historii raka skóry.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Karnacja',
        content: {
          history: 'Jasna karnacja.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia korzystania z solarium',
        content: {
          history: 'Przez 40 lat korzystała z solarium co najmniej raz w tygodniu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zgłoszenie z powodu zmian skórnych',
        content: {
          description:
            'Zgłosiła się na pełne badanie skóry z powodu niezliczonych małych, różowych grudek i łuszczących się blaszek na ramionach, nogach i plecach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd i powierzchnia zmian',
        content: {
          description:
            'Zmiany mają płaski wierzchołek i są lekko uniesione, o suchej, szorstkiej powierzchni przypominającej papier ścierny, w kolorze od jasnoróżowego do czerwonawego.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Brak owrzodzenia, tendencja do zlewania się',
        content: {
          description: 'Nie uległy owrzodzeniu, ale niektóre mają tendencję do zlewania się.',
        },
      },
    ],
    diagnosisCode: 'actinic-keratosis',
    treatmentCode: 'cryotherapy',
    difficulty: 1,
    resultExplanationText:
      'Liczne szorstkie, łuszczące się, różowe grudki będące skutkiem wieloletniego korzystania z solarium — rogowacenie słoneczne, stan przednowotworowy (nie nowotworowy).',
    sourceNote: null,
  },
  {
    patientName: 'Honorata Wysocka',
    age: 53,
    sex: 'FEMALE',
    occupation: 'Bibliotekarka',
    bodyRegion: 'OTHER',
    imageFile: 'case-19.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja potwierdza złośliwego czerniaka pochwy. Wykonano wycięcie, a następnie radioterapię i chemioterapię ze względu na biologicznie niekorzystne rokowanie niezależnie od zakresu zabiegu; pacjentka później została objęta opieką paliatywną z powodu rozsiewu przerzutowego.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Brak wcześniejszych chorób ginekologicznych',
        content: {
          history: 'Bez wcześniejszych chorób ginekologicznych.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Regularne badania cytologiczne',
        content: {
          history: 'Regularnie zgłaszała się na badania cytologiczne.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zgłoszenie z powodu krwawienia',
        content: {
          description: 'Zgłosiła się z krwawieniem z pochwy i uczuciem dyskomfortu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik badania ginekologicznego',
        content: {
          description:
            'Badanie ginekologiczne ujawniło ciemną, nieregularną zmianę na ścianie pochwy.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    resultExplanationText:
      'Rzadki i agresywny pierwotny czerniak pochwy, o niekorzystnym rokowaniu mimo leczenia.',
    sourceNote: null,
  },
  {
    patientName: 'Danuta Frąckowiak',
    age: 71,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'RIGHT_FOOT',
    imageFile: 'case-20.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja chirurgiczna, wykonana z powodu utrzymującej się, powiększającej się zmiany pigmentowej niezwiązanej z urazem, potwierdza czerniaka podpaznokciowego.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Choroby przewlekłe',
        content: {
          history: 'Przewlekłe nadciśnienie tętnicze i choroba niedokrwienna serca.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Wywiad rodzinny w kierunku raka skóry',
        content: {
          history: 'Brak rodzinnej historii raka skóry.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pojawienie się plamki pod paznokciem',
        content: {
          description:
            'Około 3 miesiące wcześniej zauważyła małą czarną plamkę pod paznokciem prawego dużego palca u nogi, bez historii urazu tej okolicy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg zmiany',
        content: {
          description:
            'Plamka stopniowo się powiększała, ale nie przesuwała się wraz ze wzrostem paznokcia, i jest całkowicie niebolesna.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Stan płytki paznokcia i wygląd plamki',
        content: {
          description:
            'Sama płytka paznokcia jest zdeformowana przez długotrwałą przewlekłą grzybicę, ale bezpośrednio pod chorą płytką znajduje się wyraźna, ciemnoczarna plamka o średnicy około 5 mm.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Węzły chłonne pachwinowe',
        content: {
          description:
            'Węzły chłonne pachwinowe nie są powiększone w badaniu palpacyjnym ani w USG.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Utrzymująca się, powiększająca się ciemna plamka pod zaatakowanym grzybicą paznokciem, niezwiązana z urazem, okazała się czerniakiem podpaznokciowym.',
    sourceNote: null,
  },
  {
    patientName: 'Julia Grzyb',
    age: 5,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'HEAD',
    imageFile: 'case-21.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Po wycięciu badanie histopatologiczne wykazało atypię komórkową z dodatnim barwieniem HMB-45, potwierdzając czerniaka spojówki.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history: 'Brak przypadków czerniaka lub innych nowotworów skóry w najbliższej rodzinie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powód skierowania do okulisty',
        content: {
          description:
            'Skierowana do okulisty z powodu stopniowo powiększającej się ciemnej zmiany na spojówce prawego oka, zlokalizowanej skroniowo, z charakterystycznymi naczyniami odżywiającymi, które zaniepokoiły lekarzy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik badań obrazowych',
        content: {
          description:
            'Badania obrazowe potwierdziły, że zmiana ogranicza się do powierzchownych warstw spojówki.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'Rzadki dziecięcy czerniak spojówki, rozpoznany dzięki charakterystycznym naczyniom odżywiającym i potwierdzony badaniem histopatologicznym dodatnim pod względem HMB-45.',
    sourceNote: null,
  },
  {
    patientName: 'Adrian Michalak',
    age: 17,
    sex: 'MALE',
    occupation: 'Uczeń',
    bodyRegion: 'RIGHT_HAND',
    imageFile: 'case-22.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Obraz kliniczny, w tym rozprzestrzenienie pigmentu poza płytkę paznokcia (objaw Hutchinsona), skłonił do wykonania biopsji macierzy paznokcia, która potwierdziła czerniaka podpaznokciowego.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Wywiad rodzinny w kierunku nowotworów skóry',
        content: {
          history: 'Brak historii nowotworów skóry w rodzinie.',
        },
      },
      {
        type: 'FAMILY_HISTORY',
        title: 'Zaniepokojenie rodziców',
        content: {
          history: 'Rodzice zaniepokojeni, ponieważ zmiana utrzymuje się od dzieciństwa.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powód zgłoszenia',
        content: {
          description:
            'Zgłosił się w celu oceny ciemnego prążka na paznokciu piątego palca prawej dłoni, obecnego od 7. roku życia i całkowicie bezobjawowego.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wygląd prążków na paznokciu',
        content: {
          description:
            'Lekarz zauważył niezwykle szerokie, ciemne pasmo zajmujące około połowy szerokości całej płytki paznokcia, obok którego widoczne były dwa mniejsze, węższe, brązowawe prążki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Rozprzestrzenienie pigmentu na wał paznokciowy',
        content: {
          description:
            'Ciemny pigment wyraźnie rozprzestrzenia się poza sam paznokieć na sąsiednie i bliższe wały paznokciowe.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Szeroki, długotrwały ciemny prążek na paznokciu z pigmentem rozprzestrzeniającym się na wał paznokciowy — czerniak podpaznokciowy.',
    sourceNote: null,
  },
  {
    patientName: 'Alicja Cisek',
    age: 73,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'RIGHT_HAND',
    imageFile: 'case-23.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Dermoskopia, a następnie biopsja wycinająca z badaniem histopatologicznym potwierdzają rogowiaka kolczystokomórkowego — szybko rosnącą zmianę z linii kolczystokomórkowej.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Długotrwała borelioza',
        content: {
          history:
            'Długotrwała borelioza od ponad 10 lat, leczona licznymi naturopatycznymi środkami zaleconymi przez naturopatę.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Brak wcześniejszych oparzeń, urazów i raka skóry',
        content: {
          history: 'Brak wcześniejszych oparzeń, urazów lub raka skóry.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia ekspozycji na promieniowanie UV',
        content: {
          history: 'Sporadyczne korzystanie z solarium w ciągu ostatnich sześciu miesięcy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pojawienie się guzka na dłoni',
        content: {
          description:
            'Nagłe pojawienie się dużego, twardego, czerwonego guzka na wewnętrznej powierzchni prawej dłoni.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Dyskomfort i swędzenie',
        content: {
          description: 'Zmiana powodowała zarówno dyskomfort estetyczny, jak i znaczne swędzenie.',
        },
      },
    ],
    diagnosisCode: 'keratoacanthoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Nagły, szybko rosnący, twardy guzek na dłoni okazał się rogowiakiem kolczystokomórkowym.',
    sourceNote:
      'Final diagnosis was not stated in the source text and was generated to complete this case, per user instruction — the sudden, rapid, dome-shaped hard nodule is consistent with keratoacanthoma.',
  },
  {
    patientName: 'Żaklina Adamska',
    age: 7,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'LEFT_LEG',
    imageFile: 'case-24.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Badanie histopatologiczne potwierdziło czerniaka typu Spitzoidalnego, sklasyfikowanego jako pT2a. Po konsultacji specjalistycznej wykonano szerokie doszczętne wycięcie oraz biopsję węzła wartowniczego, nie stwierdzając resztkowego guza ani zajęcia węzłów chłonnych. Dalsza diagnostyka wykluczyła chorobę układową. Badanie genetyczne ujawniło patogenną mutację CHEK2 (c.444+1G>A), co skutkowało skierowaniem rodziny na poradnictwo genetyczne oraz ścisłym, ciągłym nadzorem onkologicznym i dermatologicznym.',
    documents: [
      {
        type: 'FAMILY_HISTORY',
        title: 'Historia rodzinna',
        content: {
          history:
            'Wywiad rodzinny w kierunku nowotworów w trakcie ustalania po wykryciu mutacji CHEK2.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zgłoszenie z powodu zmiany na udzie',
        content: {
          description: 'Zgłosiła się ze szybko rosnącą, guzkowatą zmianą na udzie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wycięcie zmiany',
        content: {
          description: 'Zmianę wycięto.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'Dziecięcy czerniak typu Spitzoidalnego z patogenną mutacją CHEK2, wymagający poradnictwa genetycznego dla rodziny oraz dożywotniego nadzoru.',
    sourceNote: null,
  },
  {
    patientName: 'Stanisława Krzemień',
    age: 67,
    sex: 'FEMALE',
    occupation: 'Emerytka',
    bodyRegion: 'RIGHT_FOOT',
    imageFile: 'case-25.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Zdjęcie rentgenowskie palca nie wykazało uszkodzenia kości ani nacieku. Biopsja golona potwierdziła raka podstawnokomórkowego aparatu paznokciowego.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Nadciśnienie tętnicze',
        content: {
          history: 'Nadciśnienie tętnicze dobrze kontrolowane lekami.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Brak innych istotnych schorzeń',
        content: {
          history: 'Bez innych istotnych schorzeń.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zgłoszenie z powodu zmiany u paznokcia',
        content: {
          description:
            'Poza tym zdrowa, zgłasza się ze zmianą u podstawy paznokcia prawego dużego palca u nogi, obecną od 18 miesięcy, bez historii urazu mechanicznego.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Przebieg zmiany',
        content: {
          description:
            'Całkowicie niebolesna i bardzo wolno rosnąca, okresowo owrzodziała i lekko krwawiąca (na przykład przy tarciu skarpetką).',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Rozmiar i wygląd zmiany',
        content: {
          description:
            'Zmiana mierzy 1,5 cm x 2 cm wokół aparatu paznokciowego, z perłowo-białymi, uniesionymi brzegami i stwardniałym, owrzodziałym środkiem.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Węzły chłonne i tętno na stopach',
        content: {
          description:
            'Węzły chłonne pachwinowe nie są wyczuwalne palpacyjnie, a tętno na stopach jest dobrze wyczuwalne (4/4).',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Wolno rosnąca zmiana o perłowych brzegach, okresowo krwawiąca, wokół paznokcia — rak podstawnokomórkowy aparatu paznokciowego, bez naciekania kości.',
    sourceNote: null,
  },
  {
    patientName: 'Klementyna Wróbel',
    age: 58,
    sex: 'FEMALE',
    occupation: 'Instruktorka żeglarstwa',
    bodyRegion: 'HEAD',
    imageFile: 'case-26.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja potwierdza raka podstawnokomórkowego ucha; ze względu na wrażliwą kosmetycznie lokalizację wybrano chirurgię mikrograficzną Mohsa.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Historia ekspozycji na promieniowanie UV',
        content: {
          history:
            'Wieloletnia instruktorka żeglarstwa, spędzająca niemal każdy sezon w pełnym słońcu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Ewolucja zmiany na uchu',
        content: {
          description:
            'Od kilku miesięcy niewielka zmiana na górnym brzegu ucha, która początkowo wyglądała jak drobne otarcie, ale stopniowo przekształciła się w twardy, różowy guzek pokryty grubą, zrogowaciałą skórą.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Charakter guzka',
        content: {
          description:
            'Guzek jest niebolesny, nie swędzi i nie przeszkadza jej nawet podczas snu, chociaż jest widoczny dla innych.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'mohs-surgery',
    difficulty: 2,
    resultExplanationText:
      'Różowy, zrogowaciały guzek ucha u instruktorki żeglarstwa przez całe życie eksponowanej na słońce — rak podstawnokomórkowy, leczony chirurgią Mohsa w celu zachowania struktury ucha.',
    sourceNote:
      'The source text was cut off before stating a final diagnosis. This conclusion was generated to complete the case, per user instruction — a pearly/keratotic nodule on a chronically sun-exposed ear is a textbook basal cell carcinoma presentation.',
  },
  {
    patientName: 'Elwira Nowak',
    age: 42,
    sex: 'FEMALE',
    occupation: 'Robotnica budowlana',
    bodyRegion: 'LEFT_FOOT',
    imageFile: 'case-27.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja potwierdziła nowotworowe pochodzenie zmiany: rak podstawnokomórkowy podeszwy (akralny BCC), wcześniej mylnie rozpoznawany jako oporna na leczenie grzybica stóp.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Wywiad rodzinny w kierunku raka skóry',
        content: {
          history: 'Brak rodzinnej historii raka skóry.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Brak ekspozycji na promieniowanie i arsen',
        content: {
          history: 'Brak historii ekspozycji na promieniowanie lub arsen.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Praca w ciężkim obuwiu ochronnym',
        content: {
          description:
            'Od 20 lat pracuje fizycznie na budowach, nosząc przez cały dzień ciężkie, ciasne buty robocze, co powoduje przewlekłe tarcie i zatrzymywanie wilgoci na stopach.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Początek i przebieg zmiany',
        content: {
          description:
            'Po raz pierwszy zauważyła zmianę na podeszwie lewej stopy około 20. roku życia; z biegiem lat powoli się powiększała i stawała się coraz bardziej swędząca.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wcześniejsze błędne rozpoznanie',
        content: {
          description:
            'Wielokrotnie rozpoznawana przez lekarzy pierwszego kontaktu jako grzybica stóp i leczona powtarzanymi maściami przeciwgrzybiczymi bez poprawy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik badania blaszki',
        content: {
          description:
            'Badanie wykazało dobrze odgraniczoną, asymetryczną, silnie zrogowaciałą blaszkę o wymiarach 3,3 cm x 2 cm.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Węzły chłonne',
        content: {
          description: 'Węzły chłonne bez zmian.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Blaszka na podeszwie, przez lata błędnie rozpoznawana jako infekcja grzybicza, w rzeczywistości okazała się akralnym rakiem podstawnokomórkowym.',
    sourceNote: null,
  },
  {
    patientName: 'Ryszard Wolski',
    age: 62,
    sex: 'MALE',
    occupation: 'Pracownik biurowy',
    bodyRegion: 'RIGHT_FOOT',
    imageFile: 'case-28.png',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoskopia ujawnia wzór równoległych grzbietów — objaw silnie specyficzny dla czerniaka akralnego z linii lentiginous. Skierowano na biopsję celem potwierdzenia.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Cukrzyca typu II',
        content: {
          history: 'Cukrzyca typu II.',
        },
      },
      {
        type: 'DISEASE_HISTORY',
        title: 'Niewydolność żylna kończyn dolnych',
        content: {
          history: 'Łagodna niewydolność żylna kończyn dolnych.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Pojawienie się zmiany na podeszwie',
        content: {
          description:
            'Niegojąca się zmiana na podeszwie stopy, po raz pierwszy pojawiła się około 1,5 roku temu.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wcześniejsze leczenie jako odcisk',
        content: {
          description:
            'Początkowo uznana za odcisk i leczona plastrami na odciski oraz pumeksem, co powodowało krwawienie i ból.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Ciemnienie i powiększanie się zmiany',
        content: {
          description:
            'Zmiana zaczęła ciemnieć, powiększać się i okresowo krwawić bez wyraźnej przyczyny.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Brzegi zmiany',
        content: {
          description: 'Ma nieregularne brzegi.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    resultExplanationText:
      'Ciemniejąca, krwawiąca zmiana na podeszwie, przez lata mylona z odciskiem, wykazuje w dermoskopii wzór równoległych grzbietów — charakterystyczny objaw czerniaka akralnego z linii lentiginous.',
    sourceNote:
      'The source text ends at the biopsy referral without stating a confirmed result. The parallel ridge pattern described is a well-established, highly specific dermoscopic sign of acral lentiginous melanoma, so this diagnosis is a high-confidence inference rather than a freely invented one.',
  },
  {
    patientName: 'Paulina Górecka',
    age: 28,
    sex: 'FEMALE',
    occupation: 'Projektantka graficzna',
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-29.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja węzła chłonnego oraz badania obrazowe mózgu potwierdzają czerniaka z przerzutami, z zajęciem węzłów pachowych i mózgu, co tłumaczy nowe napady drgawkowe; ze względu na ciążę pilnie skierowano pacjentkę do wielodyscyplinarnego zespołu onkologicznego.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Historia choroby',
        content: { history: '26. tydzień ciąży.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nowe napady drgawkowe',
        content: {
          description: 'Ostatnio wystąpiły u niej nowe napady drgawkowe po lewej stronie.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powiększone węzły chłonne pod pachą',
        content: {
          description:
            'Mniej więcej w tym samym czasie zauważyła znacznie powiększone węzły chłonne pod pachą — twarde, ale niebolesne.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Utrata wagi i gorączka',
        content: {
          description: 'Miała także ostatnio utratę wagi i epizody gorączki.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Obawy o nienarodzone dziecko',
        content: {
          description: 'Jest bardzo zaniepokojona ryzykiem dla nienarodzonego dziecka.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    resultExplanationText:
      'Nowe napady drgawkowe wraz z twardą limfadenopatią pachową, utratą wagi i gorączką u ciężarnej pacjentki ujawniły czerniaka z przerzutami z zajęciem mózgu — rzadką i pilną postać wymagającą starannego postępowania w kontekście ciąży.',
    sourceNote:
      'No diagnosis or treatment was stated in the source text, which reads as an incomplete fragment. This conclusion was generated to complete the case, per user instruction — new seizures with hard lymphadenopathy, weight loss, and fever together point to metastatic disease with CNS involvement.',
  },
  {
    patientName: 'Roman Głowacki',
    age: 63,
    sex: 'MALE',
    occupation: 'Rolnik',
    bodyRegion: 'HEAD',
    imageFile: 'case-30.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Badania obrazowe wykazują ostro odgraniczoną, wzmacniającą się po kontraście masę tkanek miękkich; biopsja potwierdza raka podstawnokomórkowego przewodu słuchowego zewnętrznego.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Wieloletnia praca na zewnątrz',
        content: {
          history:
            'Całe życie pracował fizycznie na roli na zewnątrz, z przewlekłą ekspozycją na słońce.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Brak wcześniejszego urazu lub radioterapii',
        content: {
          history: 'Brak wcześniejszego urazu lub radioterapii.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Nawyki: palenie i alkohol',
        content: {
          history: 'Niepalący, sporadycznie spożywa alkohol.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Powód zgłoszenia do laryngologa',
        content: {
          description:
            'Zgłosił się do poradni laryngologicznej z powodu trwających 6 miesięcy dolegliwości w prawym uchu: uporczywego dyskomfortu, narastającego swędzenia i okresowej krwawej wydzieliny, wraz z uczuciem niewielkiej masy wewnątrz przewodu słuchowego oraz okresowym bólem ucha.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Zaprzeczenie innym objawom otologicznym',
        content: {
          description: 'Zaprzecza utracie słuchu, zawrotom głowy czy osłabieniu twarzy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Wynik badania przewodu słuchowego',
        content: {
          description:
            'Przewód słuchowy zewnętrzny wykazuje nieregularną, nieowrzodziałą zmianę o wymiarach 2,1 cm x 1,3 cm, z uniesionymi, perłowymi brzegami, centralnym strupem i minimalnym krwawieniem przy dotyku.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Błona bębenkowa i węzły chłonne szyi',
        content: {
          description:
            'Błona bębenkowa jest nienaruszona, a węzły chłonne szyi nie są powiększone.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'Uniesiona zmiana o perłowych brzegach wewnątrz przewodu słuchowego u rolnika pracującego całe życie na zewnątrz — rak podstawnokomórkowy przewodu słuchowego zewnętrznego, rzadka lokalizacja.',
    sourceNote: null,
  },
  {
    patientName: 'Sabrina Kowal',
    age: 45,
    sex: 'FEMALE',
    occupation: 'Pielęgniarka',
    bodyRegion: 'HEAD',
    imageFile: 'case-31.png',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsja wyklucza złośliwość i wykazuje rogowacenie słoneczne — zmianę przednowotworową związaną ze słońcem, nie nowotwór.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Karnacja',
        content: {
          history: 'Jasna karnacja.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Opalanie w młodości',
        content: {
          history: 'W młodości często opalała się bez ochrony przeciwsłonecznej.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Utrzymująca się rana nad wargą',
        content: {
          description: 'Przez trzy i pół roku żyła z łuszczącą się, suchą raną nad wargą.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Nieskuteczne leczenie miejscowe',
        content: {
          description:
            'Jej lekarz pierwszego kontaktu wielokrotnie leczył ją kremami na wyprysk i wysypkę, bez poprawy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Prośba o biopsję',
        content: {
          description:
            'Jako wykwalifikowana pielęgniarka nabrała podejrzeń i sama poprosiła o biopsję skóry, aby wykluczyć nowotwór.',
        },
      },
    ],
    diagnosisCode: 'actinic-keratosis',
    treatmentCode: null,
    difficulty: 1,
    resultExplanationText:
      'Utrzymująca się, łuszcząca się rana nad wargą, niereagująca na leczenie wyprysku, okazała się rogowaceniem słonecznym, a nie nowotworem.',
    sourceNote: null,
  },
];
