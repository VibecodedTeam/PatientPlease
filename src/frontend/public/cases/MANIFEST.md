# Case Photos

Every case now has an image assigned (`case-01.png` through `case-31.png`).
Real photos were used where available (matched by the case number in your
original filenames); every other case reuses the closest-matching stock
photo from `STOCK_CANCER1-4.png`, `STOCK_CLEAN1-2.png`,
`STOCK_CLEARMYSTERIOUS.png`, and `STOCK_PRZEBARWIENIE.png`.

**Known limitation:** none of the 8 stock photos show a Basal Cell
Carcinoma, Squamous Cell Carcinoma, or Keratoacanthoma presentation
specifically (pearly nodules, scaly plaques, etc.) — the 8 cases with
those diagnoses (case-10, 11, 13, 17, 23, 25, 26, 27, 30) currently reuse
the melanoma-style `STOCK_CANCER*` photos as a placeholder, since that
was the closest available option. If you get category-specific stock
photos later, swap those files in — no code change needed, just replace
the file at the same filename.

| Filename | Patient | Diagnosis | Source |
|---|---|---|---|
| case-01.png | Irena Kwiat | Dysplastic Nevus (benign/atypical) | STOCK_CLEARMYSTERIOUS.png (multiple small pigmented spots) |
| case-02.png | Dariusz Wilk | Melanoma | STOCK_CANCER1.png |
| case-03.png | Robert Sadowski | Melanoma | real photo (Case 3.png) |
| case-04.png | Kamil Zych | Melanoma | real photo (Case 4.png) |
| case-05.png | Bogumiła Nowicka | Melanoma | real photo (Case 5.png) |
| case-06.png | Wanda Kaczmarek | Melanoma | STOCK_CANCER2.png |
| case-07.png | Zenon Lis | Melanoma | STOCK_CANCER3.png |
| case-08.png | Barbara Sikora | Melanoma | STOCK_CANCER4.png |
| case-09.png | Józef Baran | Melanoma | real photo (Case 9.png) |
| case-10.png | Marcin Krupa | Basal Cell Carcinoma | STOCK_CANCER1.png (placeholder — no BCC-specific stock) |
| case-11.png | Zofia Wrona | Squamous Cell Carcinoma | STOCK_CANCER2.png (placeholder — no SCC-specific stock) |
| case-12.png | Horacjusz Duda | Melanoma | STOCK_CANCER3.png |
| case-13.png | Hiacynta Górska | Melanoma | STOCK_CANCER4.png |
| case-14.png | Krystyna Sroka | Melanoma | STOCK_CANCER1.png |
| case-15.png | Tomasz Ryba | Melanoma | STOCK_CANCER2.png |
| case-16.png | Kacper Sobczak | Melanoma | STOCK_CANCER3.png |
| case-17.png | Halina Wilczek | Squamous Cell Carcinoma | STOCK_CANCER4.png (placeholder — no SCC-specific stock) |
| case-18.png | Grażyna Sowa | Actinic Keratosis (not cancer) | STOCK_PRZEBARWIENIE.png (patchy discoloration) |
| case-19.png | Honorata Wysocka | Melanoma | STOCK_CANCER1.png |
| case-20.png | Danuta Frąckowiak | Melanoma | STOCK_CANCER2.png |
| case-21.png | Julia Grzyb | Melanoma | real photo (Case 21.png) |
| case-22.png | Adrian Michalak | Melanoma | STOCK_CANCER3.png |
| case-23.png | Alicja Cisek | Keratoacanthoma | STOCK_CANCER4.png (placeholder — no keratoacanthoma-specific stock) |
| case-24.png | Żaklina Adamska | Melanoma | STOCK_CANCER1.png |
| case-25.png | Stanisława Krzemień | Basal Cell Carcinoma | STOCK_CANCER2.png (placeholder — no BCC-specific stock) |
| case-26.png | Klementyna Wróbel | Basal Cell Carcinoma | STOCK_CANCER3.png (placeholder — no BCC-specific stock) |
| case-27.png | Elwira Nowak | Basal Cell Carcinoma | STOCK_CANCER4.png (placeholder — no BCC-specific stock) |
| case-28.png | Ryszard Wolski | Melanoma | STOCK_CANCER1.png |
| case-29.png | Paulina Górecka | Melanoma | STOCK_CANCER2.png |
| case-30.png | Roman Głowacki | Basal Cell Carcinoma | STOCK_CANCER3.png (placeholder — no BCC-specific stock) |
| case-31.png | Sabrina Kowal | Actinic Keratosis (not cancer) | STOCK_CLEAN1.png (unremarkable-looking skin) |

`STOCK_CLEAN2.png` was not used — kept in the folder in case you want to
swap it in for a case later.
