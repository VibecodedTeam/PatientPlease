import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { REAL_CASES, type Sex } from './data/realCases.js';
import { FICTIONAL_CASES } from './data/fictionalCases.js';
import { resolveCaseSeedRefs } from './caseSeedRefs.js';

export const DIAGNOSES: Prisma.DiagnosisCreateManyInput[] = [
  {
    code: 'melanoma',
    name: 'Czerniak',
    category: 'MALIGNANT',
    description:
      'Złośliwy nowotwór melanocytów, często powstający w zmieniającym się znamieniu o asymetrycznych brzegach.',
  },
  {
    code: 'basal-cell-carcinoma',
    name: 'Rak podstawnokomórkowy',
    category: 'MALIGNANT',
    description:
      'Najczęstszy nowotwór skóry, zwykle w postaci perłowego guzka lub niegojącej się rany na skórze eksponowanej na słońce.',
  },
  {
    code: 'squamous-cell-carcinoma',
    name: 'Rak kolczystokomórkowy',
    category: 'MALIGNANT',
    description:
      'Złośliwy nowotwór keratynocytów w postaci łuszczącej się, pokrytej strupem lub owrzodziałej blaszki.',
  },
  {
    code: 'bowens-disease',
    name: 'Choroba Bowena',
    category: 'MALIGNANT',
    description:
      'Rak kolczystokomórkowy in situ, występujący jako powoli rosnąca, łuszcząca się czerwona plama.',
  },
  {
    code: 'keratoacanthoma',
    name: 'Rogowiak kolczystokomórkowy',
    category: 'MALIGNANT',
    description:
      'Szybko rosnący, kopulasty guzek z centralnym czopem rogowym, spokrewniony z rakiem kolczystokomórkowym.',
  },
  {
    code: 'actinic-keratosis',
    name: 'Rogowacenie słoneczne',
    category: 'OTHER',
    description:
      'Szorstka, łuszcząca się zmiana przedrakowa spowodowana skumulowanym uszkodzeniem słonecznym.',
  },
  {
    code: 'dysplastic-nevus',
    name: 'Znamię dysplastyczne',
    category: 'OTHER',
    description:
      'Atypowe znamię o nieregularnych brzegach i kolorze, wiążące się ze zwiększonym ryzykiem czerniaka.',
  },
  {
    code: 'seborrheic-keratosis',
    name: 'Brodawka łojotokowa',
    category: 'BENIGN',
    description:
      'Częsta, łagodna, woskowata lub brodawkowata brązowa narośl, która wygląda jak „naklejona" na skórę.',
  },
  {
    code: 'common-nevus',
    name: 'Znamię (zwykłe)',
    category: 'BENIGN',
    description:
      'Łagodne, dobrze odgraniczone skupisko melanocytów o równomiernym kolorze i brzegach.',
  },
  {
    code: 'dermatofibroma',
    name: 'Włókniak twardy',
    category: 'BENIGN',
    description:
      'Twardy, łagodny guzek z tkanki włóknistej, często na podudziach, który zapada się przy uciśnięciu.',
  },
  {
    code: 'vitiligo',
    name: 'Bielactwo',
    category: 'OTHER',
    description: 'Choroba autoimmunologiczna powodująca plamiste zaniki barwnika skóry.',
  },
  {
    code: 'melasma',
    name: 'Ostuda',
    category: 'OTHER',
    description:
      'Symetryczne brązowe plamy przebarwień na twarzy związane z ekspozycją na słońce i hormonami.',
  },
  {
    code: 'psoriasis',
    name: 'Łuszczyca',
    category: 'INFLAMMATORY',
    description:
      'Przewlekła choroba autoimmunologiczna powodująca grube, srebrzyste, łuszczące się blaszki.',
  },
  {
    code: 'atopic-dermatitis',
    name: 'Wyprysk (atopowe zapalenie skóry)',
    category: 'INFLAMMATORY',
    description: 'Przewlekła, swędząca, zapalna wysypka częsta u pacjentów z wywiadem atopowym.',
  },
  {
    code: 'contact-dermatitis',
    name: 'Kontaktowe zapalenie skóry',
    category: 'INFLAMMATORY',
    description:
      'Swędząca, zapalna wysypka wywołana bezpośrednim kontaktem z czynnikiem drażniącym lub alergenem.',
  },
  {
    code: 'rosacea',
    name: 'Trądzik różowaty',
    category: 'INFLAMMATORY',
    description: 'Przewlekłe zaczerwienienie twarzy, często z widocznymi naczynkami i grudkami.',
  },
  {
    code: 'acne-vulgaris',
    name: 'Trądzik pospolity',
    category: 'INFLAMMATORY',
    description:
      'Częsta zapalna choroba mieszków włosowych powodująca zaskórniki, grudki i krosty.',
  },
  {
    code: 'lichen-planus',
    name: 'Liszaj płaski',
    category: 'INFLAMMATORY',
    description: 'Choroba zapalna powodująca swędzące, płaskie, fioletowe grudki.',
  },
  {
    code: 'urticaria',
    name: 'Pokrzywka',
    category: 'INFLAMMATORY',
    description: 'Swędzące, wyniosłe bąble wywołane reakcją alergiczną lub histaminową.',
  },
  {
    code: 'alopecia-areata',
    name: 'Łysienie plackowate',
    category: 'OTHER',
    description: 'Choroba autoimmunologiczna powodująca nagłą, plackowatą utratę włosów.',
  },
  {
    code: 'tinea-corporis',
    name: 'Grzybica skóry gładkiej',
    category: 'INFECTIOUS',
    description:
      'Zakażenie grzybicze powodujące swędzącą, pierścieniowatą wysypkę z uniesionym brzegiem.',
  },
  {
    code: 'impetigo',
    name: 'Liszajec zakaźny',
    category: 'INFECTIOUS',
    description:
      'Zakaźne bakteryjne zakażenie skóry powodujące miodowo-żółte, pokryte strupem rany.',
  },
  {
    code: 'cellulitis',
    name: 'Zapalenie tkanki łącznej',
    category: 'INFECTIOUS',
    description:
      'Bakteryjne zakażenie głębszych warstw skóry powodujące zaczerwienienie, ocieplenie i obrzęk.',
  },
  {
    code: 'molluscum-contagiosum',
    name: 'Mięczak zakaźny',
    category: 'INFECTIOUS',
    description:
      'Zakażenie wirusowe powodujące małe, twarde, kopulaste grudki z centralnym zagłębieniem.',
  },
  {
    code: 'verruca-vulgaris',
    name: 'Brodawki (zwykłe)',
    category: 'INFECTIOUS',
    description: 'Częste wirusowe zakażenie skóry powodujące szorstkie, wyniosłe narośla.',
  },
];

export const TREATMENTS: Prisma.TreatmentCreateManyInput[] = [
  {
    code: 'topical-corticosteroid',
    name: 'Kortykosteroid miejscowy',
    kind: 'TOPICAL',
    description: 'Przeciwzapalny krem lub maść nakładany bezpośrednio na zmienioną skórę.',
  },
  {
    code: 'topical-retinoid',
    name: 'Retinoid miejscowy',
    kind: 'TOPICAL',
    description:
      'Krem będący pochodną witaminy A, stosowany w celu normalizacji odnowy komórek skóry.',
  },
  {
    code: 'topical-antifungal',
    name: 'Miejscowy krem przeciwgrzybiczy',
    kind: 'TOPICAL',
    description:
      'Krem przeciwgrzybiczy nakładany w celu wyleczenia miejscowego zakażenia grzybiczego skóry.',
  },
  {
    code: 'topical-antibiotic',
    name: 'Miejscowa maść antybiotykowa',
    kind: 'TOPICAL',
    description: 'Maść antybiotykowa nakładana na miejscowe bakteryjne zakażenie skóry.',
  },
  {
    code: 'topical-calcineurin-inhibitor',
    name: 'Miejscowy inhibitor kalcyneuryny',
    kind: 'TOPICAL',
    description:
      'Miejscowy immunomodulator oszczędzający steroidy, stosowany w przewlekłych zapalnych chorobach skóry.',
  },
  {
    code: 'oral-antibiotic',
    name: 'Doustna antybiotykoterapia',
    kind: 'ORAL_MEDICATION',
    description:
      'Ogólnoustrojowa antybiotykoterapia w rozprzestrzeniającym się lub głębokim bakteryjnym zakażeniu skóry.',
  },
  {
    code: 'oral-antifungal',
    name: 'Doustny lek przeciwgrzybiczy',
    kind: 'ORAL_MEDICATION',
    description:
      'Ogólnoustrojowy lek przeciwgrzybiczy w rozległym lub opornym zakażeniu grzybiczym.',
  },
  {
    code: 'oral-antihistamine',
    name: 'Doustny lek przeciwhistaminowy',
    kind: 'ORAL_MEDICATION',
    description: 'Doustny lek łagodzący świąd i alergiczne reakcje skórne.',
  },
  {
    code: 'oral-corticosteroid',
    name: 'Doustny kortykosteroid',
    kind: 'ORAL_MEDICATION',
    description: 'Krótka ogólnoustrojowa steroidoterapia w ciężkich zaostrzeniach zapalnych.',
  },
  {
    code: 'oral-isotretinoin',
    name: 'Doustna izotretynoina',
    kind: 'ORAL_MEDICATION',
    description: 'Ogólnoustrojowy retinoid stosowany w ciężkim, opornym na leczenie trądziku.',
  },
  {
    code: 'surgical-excision',
    name: 'Wycięcie chirurgiczne',
    kind: 'PROCEDURE',
    description: 'Całkowite chirurgiczne usunięcie zmiany z marginesem zdrowej tkanki.',
  },
  {
    code: 'mohs-surgery',
    name: 'Chirurgia mikrograficzna Mohsa',
    kind: 'PROCEDURE',
    description:
      'Etapowa technika chirurgiczna usuwająca raka skóry warstwa po warstwie pod kontrolą mikroskopową.',
  },
  {
    code: 'cryotherapy',
    name: 'Krioterapia',
    kind: 'PROCEDURE',
    description: 'Zamrażanie zmiany ciekłym azotem w celu zniszczenia nieprawidłowej tkanki.',
  },
  {
    code: 'curettage-electrodesiccation',
    name: 'Łyżeczkowanie i elektrokoagulacja',
    kind: 'PROCEDURE',
    description: 'Zeskrobanie zmiany i przyżeganie podstawy, aby zapobiec ponownemu wzrostowi.',
  },
  {
    code: 'laser-therapy',
    name: 'Terapia laserowa',
    kind: 'PROCEDURE',
    description:
      'Celowane leczenie laserem stosowane do usunięcia lub rozjaśnienia zmiany skórnej.',
  },
  {
    code: 'phototherapy-uvb',
    name: 'Fototerapia (UVB)',
    kind: 'PROCEDURE',
    description:
      'Kontrolowana ekspozycja na światło ultrafioletowe w leczeniu rozległych zapalnych chorób skóry.',
  },
  {
    code: 'photodynamic-therapy',
    name: 'Terapia fotodynamiczna',
    kind: 'PROCEDURE',
    description:
      'Miejscowe leczenie aktywowane światłem, niszczące komórki przedrakowe lub rakowe.',
  },
  {
    code: 'chemical-peel',
    name: 'Peeling chemiczny',
    kind: 'PROCEDURE',
    description:
      'Kontrolowane złuszczanie chemiczne stosowane w leczeniu przebarwień i powierzchownych zmian.',
  },
  {
    code: 'referral-oncology',
    name: 'Skierowanie do onkologii',
    kind: 'REFERRAL',
    description:
      'Skierowanie pacjenta do onkologa z powodu podejrzewanego lub potwierdzonego raka skóry.',
  },
  {
    code: 'referral-dermatology',
    name: 'Skierowanie do dermatologii',
    kind: 'REFERRAL',
    description: 'Skierowanie pacjenta do dermatologa na ocenę specjalistyczną.',
  },
  {
    code: 'referral-allergy',
    name: 'Skierowanie do alergologa',
    kind: 'REFERRAL',
    description:
      'Skierowanie pacjenta do alergologa z powodu podejrzewanej alergicznej choroby skóry.',
  },
  {
    code: 'referral-infectious-disease',
    name: 'Skierowanie do zakaźnika',
    kind: 'REFERRAL',
    description:
      'Skierowanie pacjenta do specjalisty chorób zakaźnych z powodu ciężkiego lub nietypowego zakażenia.',
  },
  {
    code: 'watchful-waiting',
    name: 'Obserwacja',
    kind: 'MONITORING',
    description:
      'Odroczenie aktywnego leczenia przy jednoczesnym monitorowaniu zmiany niskiego ryzyka w czasie.',
  },
  {
    code: 'routine-follow-up',
    name: 'Rutynowa kontrola',
    kind: 'MONITORING',
    description: 'Zaplanowanie okresowych wizyt kontrolnych w celu śledzenia stabilnego stanu.',
  },
  {
    code: 'no-treatment',
    name: 'Leczenie niepotrzebne',
    kind: 'NONE',
    description: 'W przypadku tej łagodnej zmiany leczenie nie jest wymagane.',
  },
];

export const SHOP_ITEMS: Prisma.ShopItemCreateManyInput[] = [
  {
    sku: 'equip-dermatoscope',
    name: 'Dermatoskop',
    itemType: 'EQUIPMENT',
    price: 150,
    description: 'Ręczny powiększalnik ze spolaryzowanym światłem do dokładnej oceny zmian.',
  },
  {
    sku: 'equip-woods-lamp',
    name: 'Lampa Wooda (UV)',
    itemType: 'EQUIPMENT',
    price: 120,
    description:
      'Lampa ultrafioletowa ujawniająca zmiany grzybicze i barwnikowe niewidoczne w zwykłym świetle.',
  },
  {
    sku: 'equip-macro-camera',
    name: 'Cyfrowy aparat makro',
    itemType: 'EQUIPMENT',
    price: 200,
    description:
      'Nasadka aparatu do fotografowania z bliska, do szczegółowego dokumentowania zmian.',
  },
  {
    sku: 'equip-loupe',
    name: 'Lupa',
    itemType: 'EQUIPMENT',
    price: 60,
    description: 'Prosty ręczny powiększalnik do szybkiej oceny wzrokowej.',
  },
  {
    sku: 'equip-biopsy-kit',
    name: 'Zestaw do biopsji sztancowej',
    itemType: 'EQUIPMENT',
    price: 180,
    description: 'Jałowy zestaw sztancowy do pobierania małych wycinków tkanki.',
  },
  {
    sku: 'equip-dermo-light',
    name: 'Przenośne światło dermoskopowe',
    itemType: 'EQUIPMENT',
    price: 90,
    description: 'Doczepiane źródło światła poprawiające widoczność w dermoskopie.',
  },
  {
    sku: 'equip-skin-scanner',
    name: 'Cyfrowy skaner skóry',
    itemType: 'EQUIPMENT',
    price: 300,
    description: 'Urządzenie skanujące, które automatycznie mapuje brzegi i asymetrię zmiany.',
  },
  {
    sku: 'equip-uv-meter',
    name: 'Ręczny miernik UV',
    itemType: 'EQUIPMENT',
    price: 75,
    description: 'Miernik do oceny zarejestrowanej ekspozycji pacjenta na promieniowanie UV.',
  },
  {
    sku: 'equip-instrument-tray',
    name: 'Jałowa taca na narzędzia',
    itemType: 'EQUIPMENT',
    price: 50,
    description: 'Taca z jałowymi narzędziami do drobnych zabiegów w gabinecie.',
  },
  {
    sku: 'equip-ultrasound',
    name: 'Przenośna głowica USG',
    itemType: 'EQUIPMENT',
    price: 350,
    description: 'Kompaktowa głowica ultrasonograficzna do obrazowania głębszych struktur skóry.',
  },
  {
    sku: 'book-atlas-derm-1',
    name: 'Atlas dermatologii, tom 1',
    itemType: 'HANDBOOK',
    price: 100,
    description: 'Atlas referencyjny częstych chorób skóry ze zdjęciami porównawczymi obok siebie.',
  },
  {
    sku: 'book-atlas-derm-2',
    name: 'Atlas dermatologii, tom 2',
    itemType: 'HANDBOOK',
    price: 100,
    description: 'Drugi tom atlasu dermatologii, obejmujący rzadsze prezentacje.',
  },
  {
    sku: 'book-pigmented-lesions',
    name: 'Przewodnik po zmianach barwnikowych',
    itemType: 'HANDBOOK',
    price: 80,
    description: 'Kieszonkowy przewodnik skupiony na odróżnianiu łagodnych znamion od czerniaka.',
  },
  {
    sku: 'book-pediatric-derm',
    name: 'Podręcznik dermatoz dziecięcych',
    itemType: 'HANDBOOK',
    price: 90,
    description: 'Opracowanie dotyczące chorób skóry typowych dla niemowląt i dzieci.',
  },
  {
    sku: 'book-infectious-manual',
    name: 'Poradnik zakaźnych chorób skóry',
    itemType: 'HANDBOOK',
    price: 85,
    description: 'Poradnik obejmujący bakteryjne, grzybicze i wirusowe zakażenia skóry.',
  },
  {
    sku: 'book-inflammatory-ref',
    name: 'Kompendium dermatoz zapalnych',
    itemType: 'HANDBOOK',
    price: 85,
    description: 'Opracowanie dotyczące przewlekłych zapalnych chorób skóry i ich leczenia.',
  },
  {
    sku: 'book-onco-derm',
    name: 'Podstawy onkodermatologii',
    itemType: 'HANDBOOK',
    price: 130,
    description: 'Przewodnik po podstawach diagnozowania i stopniowania nowotworów skóry.',
  },
  {
    sku: 'book-diff-diagnosis',
    name: 'Kieszonkowy przewodnik diagnostyki różnicowej',
    itemType: 'HANDBOOK',
    price: 70,
    description: 'Podręczny przewodnik do zawężania podobnie wyglądających chorób skóry.',
  },
  {
    sku: 'book-treatment-protocols',
    name: 'Kompendium protokołów leczenia',
    itemType: 'HANDBOOK',
    price: 95,
    description: 'Kompendium standardowych protokołów leczenia według schorzeń.',
  },
  {
    sku: 'book-clinical-photo',
    name: 'Fotografia kliniczna w dermatologii',
    itemType: 'HANDBOOK',
    price: 60,
    description: 'Przewodnik po wykonywaniu spójnych zdjęć klinicznych o jakości diagnostycznej.',
  },
  {
    sku: 'exam-punch-biopsy',
    name: 'Biopsja sztancowa',
    itemType: 'EXAMINATION',
    price: 140,
    description:
      'Mały wycinek tkanki wysyłany do patomorfologii w celu ostatecznego badania histologicznego.',
    content: { timeCostMs: 90_000 },
  },
  {
    sku: 'exam-dermoscopy',
    name: 'Obrazowanie dermoskopowe',
    itemType: 'EXAMINATION',
    price: 80,
    description:
      'Powiększone, spolaryzowane obrazowanie ujawniające podpowierzchniowe struktury zmiany.',
    content: { timeCostMs: 30_000 },
  },
  {
    sku: 'exam-skin-scraping-koh',
    name: 'Zeskrobiny skórne (preparat KOH)',
    itemType: 'EXAMINATION',
    price: 60,
    description:
      'Preparat z zeskrobin łuski w wodorotlenku potasu potwierdzający zakażenie grzybicze.',
    content: { timeCostMs: 45_000 },
  },
  {
    sku: 'exam-bacterial-culture',
    name: 'Posiew bakteryjny z antybiogramem',
    itemType: 'EXAMINATION',
    price: 100,
    description:
      'Wymaz posiany w celu identyfikacji patogenu bakteryjnego i jego wrażliwości na antybiotyki.',
    content: { timeCostMs: 120_000 },
  },
  {
    sku: 'exam-patch-test',
    name: 'Naskórkowe testy płatkowe',
    itemType: 'EXAMINATION',
    price: 90,
    description:
      'Panel alergenów nakładanych na skórę w celu zidentyfikowania alergenu kontaktowego.',
    content: { timeCostMs: 60_000 },
  },
  {
    sku: 'plot-loan-notice',
    name: 'Wezwanie do spłaty zaległej pożyczki',
    itemType: 'PLOT_ITEM',
    price: 0,
    description:
      'Surowe wezwanie przypominające lekarzowi o niespłaconym saldzie pożyczki studenckiej.',
  },
  {
    sku: 'plot-family-photo',
    name: 'Zdjęcie rodzinne',
    itemType: 'PLOT_ITEM',
    price: 0,
    description: 'Zniszczone zdjęcie, które lekarz trzyma na biurku dla motywacji.',
  },
  {
    sku: 'plot-diploma',
    name: 'Stary dyplom lekarski',
    itemType: 'PLOT_ITEM',
    price: 0,
    description: 'Oprawiony dyplom lekarza, przypomnienie o tym, po co zaczął.',
  },
  {
    sku: 'plot-eviction-warning',
    name: 'Ostrzeżenie o eksmisji od właściciela',
    itemType: 'PLOT_ITEM',
    price: 0,
    description: 'List ostrzegawczy dotyczący zaległego czynszu lekarza.',
  },
  {
    sku: 'plot-thank-you-note',
    name: 'Odręczny list z podziękowaniem od pacjenta',
    itemType: 'PLOT_ITEM',
    price: 0,
    description: 'Wdzięczny list od pacjenta, którego lekarz kiedyś leczył.',
  },
];

const BODY_MODEL_VARIANTS = [
  'male_average_01',
  'female_average_01',
  'male_slim_01',
  'female_slim_01',
] as const;

function pickBodyModelVariant(sex: Sex, index: number): (typeof BODY_MODEL_VARIANTS)[number] {
  if (sex === 'MALE') {
    return index % 2 === 0 ? 'male_average_01' : 'male_slim_01';
  }
  if (sex === 'FEMALE') {
    return index % 2 === 0 ? 'female_average_01' : 'female_slim_01';
  }
  return BODY_MODEL_VARIANTS[index % BODY_MODEL_VARIANTS.length]!;
}

const FALLBACK_PORTRAIT_FILES = [
  '001_45-year-old-male-stern-square-jaw-recedi_20260709-152719.png',
  '002_elderly-woman-soft-round-face-smile-line_20260709-152810.png',
  '003_45-year-old-male-square-jaw-with-light-s_20260709-152832.png',
  '004_middle-aged-female-sharp-cheekbones-hook_20260709-152854.png',
  '005_middle-aged-male-strong-jawline-and-slig_20260709-152914.png',
  '006_elderly-male-wrinkled-forehead-and-bushy_20260709-152928.png',
  '007_elderly-female-high-cheekbones-and-thin-_20260709-152944.png',
  '008_80-year-old-woman-high-cheekbones-thin-l_20260709-153010.png',
  '009_45-year-old-male-strong-jawline-faint-cr_20260709-153107.png',
  '010_middle-aged-female-rounded-cheeks-should_20260709-153146.png',
] as const;

/** The first 15 cases (case-01..case-15) get a dedicated mock portrait; every other
 * patient cycles through the existing generic portrait set. */
function pickPortraitImageUrl(imageFile: string, index: number): string {
  const caseNumber = Number(imageFile.match(/^case-(\d+)\.png$/)?.[1]);
  if (caseNumber >= 1 && caseNumber <= 15) {
    return `/portraits/portrait-${String(caseNumber).padStart(2, '0')}.png`;
  }
  return `/patient-portraits/${FALLBACK_PORTRAIT_FILES[index % FALLBACK_PORTRAIT_FILES.length]}`;
}

export async function seed(options: { force?: boolean } = {}): Promise<void> {
  const alreadySeeded = (await prisma.diagnosis.count()) > 0;
  if (alreadySeeded && !options.force) {
    console.log('Database already seeded — skipping. Pass { force: true } / --force to reseed.');
    return;
  }

  await prisma.diagnosisAttempt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.gameplayLog.deleteMany();
  await prisma.caseHint.deleteMany();
  await prisma.caseDocumentReveal.deleteMany();
  await prisma.caseDocument.deleteMany();
  await prisma.case.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.ownedItem.deleteMany();
  await prisma.shopItem.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.treatment.deleteMany();

  await prisma.diagnosis.createMany({ data: DIAGNOSES });
  await prisma.treatment.createMany({ data: TREATMENTS });
  await prisma.shopItem.createMany({ data: SHOP_ITEMS });

  const diagnoses = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' } });
  const treatments = await prisma.treatment.findMany({ orderBy: { code: 'asc' } });
  const shopItems = await prisma.shopItem.findMany({ orderBy: { sku: 'asc' } });

  const ALL_CASES = [...REAL_CASES, ...FICTIONAL_CASES];

  for (let i = 0; i < ALL_CASES.length; i++) {
    const realCase = ALL_CASES[i]!;
    const { diagnosisId, treatmentId, examinationShopItemId } = resolveCaseSeedRefs(realCase, {
      diagnoses,
      treatments,
      shopItems,
    });
    const diagnosis = diagnoses.find((d) => d.id === diagnosisId)!;

    const patient = await prisma.patient.create({
      data: {
        name: realCase.patientName,
        age: realCase.age,
        sex: realCase.sex,
        occupation: realCase.occupation,
        portraitImageUrl: pickPortraitImageUrl(realCase.imageFile, i),
        bodyModelVariant: pickBodyModelVariant(realCase.sex, i),
      },
    });

    const caseRecord = await prisma.case.create({
      data: {
        patientId: patient.id,
        difficulty: realCase.difficulty,
        featuredOrder: realCase.featuredOrder ?? null,
        correctDiagnosisId: diagnosisId,
        correctTreatmentId: treatmentId,
        moneyReward: 50 + realCase.difficulty * 25,
        moneyPenalty: 20 + realCase.difficulty * 10,
        resultExplanationText: realCase.resultExplanationText,
      },
    });

    await prisma.caseDocument.create({
      data: {
        caseId: caseRecord.id,
        type: 'SKIN_IMAGE',
        attentionPointRegion: realCase.bodyRegion,
        title: 'Zbliżenie zmiany skórnej',
        sortOrder: 0,
        imageUrl: `/cases/${realCase.imageFile}`,
        imageWidthPx: 1024,
        imageHeightPx: 768,
        imageAltText: `Zbliżenie zmiany skórnej u ${patient.name}`,
      },
    });

    for (const [index, document] of realCase.documents.entries()) {
      await prisma.caseDocument.create({
        data: {
          caseId: caseRecord.id,
          type: document.type,
          title: document.title,
          sortOrder: index + 1,
          content: (document.content as Prisma.InputJsonValue | null) ?? Prisma.DbNull,
        },
      });
    }

    await prisma.caseDocument.create({
      data: {
        caseId: caseRecord.id,
        type: 'EXAMINATION_RESULTS',
        title: 'Wyniki badania',
        sortOrder: realCase.documents.length + 1,
        content: {
          shopItemId: examinationShopItemId,
          findings: realCase.examinationFindings,
        },
      },
    });

    await prisma.caseHint.create({
      data: {
        caseId: caseRecord.id,
        content: `Rozważ rozpoznanie: ${diagnosis.name}, biorąc pod uwagę ten obraz kliniczny.`,
        sortOrder: 0,
        unlockAfterDay: 1,
        requiredShopItemId: null,
      },
    });
  }
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const force = process.argv.includes('--force');
  seed({ force })
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
