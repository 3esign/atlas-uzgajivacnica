# Atlas uzgajivačnica · Aviary Atlas

**Deset prostora koje su ljudi između Zadra i Banje Luke sagradili za ptice, viđenih kao arhitektura, i jedan projekat koji je iz njih nastao.**

Interaktivni **2D · 2.5D · 3D** prostorni atlas i virtuelni vrt (*Hortus*) zasnovan na diplomskom radu:

- **Autorka:** Lucija Jurlin Dorbić
- **Mentor:** doc. dr. Semir Poturak
- **Institucija:** Univerzitet u Travniku (2026)

## Živa verzija (Web / Mobilni / Desktop)

👉 **[https://3esign.github.io/atlas-uzgajivacnica/](https://3esign.github.io/atlas-uzgajivacnica/)**

## Pogledi i kontinuum dimenzija ($0\text{D} \to 2\text{D} \to 2.5\text{D} \to 3\text{D}$)

- **🏛 Maketa (3D):** Slobodan orbitalni pregled zgrade (`12,00 × 12,00 m`, zvezdasti 17-temeni tlocrt, krovni vrtovi na `+8,85 m`, atika `+9,25 m`) i parcele `k.č. 1004` u Donjem Polju kod Šibenika.
- **⬡ 2.5D Akso:** Prava ortografska aksonometrija bez perspektivnog skraćenja, sa kotnom mrežom na tlu (`175 / 250 / 175 cm`), osovinama rasklopa i tehničkim ivicama.
- **📐 2D Nacrt (CAD studio):** Interaktivni vektorski nacrti iz originalnog `Jurlin_Ptičarnik.dwg` (tlocrti svih etaža, presjek A-A, pročelja, 4-up sintezni list sa ISO 128 zaglavljem), **2.5D izometrijska tipološka matrica (10+1)** i **2.5D regionalni kartogram**.
- **✦ Tura (7):** Vođena šetnja kroz 7 ključnih stanica sa karticama podataka i generativnim zvukom vetra i ptica.
- **🚶 Šetnja (1. lice / FPS):** Hodanje kroz prizemlje, penjanje uz spiralno stubište ($\varnothing 2,16\text{ m}$) na 1. i 2. kat, sa virtuelnom palicom (*joystick*) i dodirom na telefonu ili `WASD` + miš na računaru.
- **↕ Presjek:** Rasklop etaža sa živim DWG vektorskim listom `Presjek A-A` u ravni reza ($z=0$).
- **⊞ Tlocrt:** Ortografski pogled odozgo po etažama (`P`, `1`, `2`, `K`).

## Pokretanje i provera lokalno (bez zavisnosti)

```bash
node build.js
node tests/check.cjs
```
