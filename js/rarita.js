// rarita.js — scritto da tools/rarita.js: non si modifica a mano.
// Quanto è raro ogni particolare, misurato su 3.000.000 nomi (r0, r1, r2…).
export const CAMPIONE = 3000000;
export const PASSO = 25;
export const FREQUENZE = {"aurora":0.119998,"civilta":0.172416,"asse":0.060055,"dueSoli":0.0300593,"nebulosa":0.015011,"mariLuce":0.00769433,"esagono":0.00797233,"oceanoGlobale":0.00798333,"cromatico":0.00392433,"pianetaCitta":0.00105633,"lunaGigante":0.085243,"anelliImmensi":0.0377217,"giornoLampo":0.040059,"giornoEterno":0.0398983,"colosso":0.040152,"minuscolo":0.0399727,"rigoglio":0.0215397,"treCicloni":0.0570497,"cieloCoperto":0.0210603,"gemello":0.00327567,"notteAccesa":0.000355,"sottoDueSoli":0.005229,"civiltaDeserto":0.00873,"incoronato":0.0606853,"giardino":0.0215397,"perla":0.001736};
// pesi in centesimi di bit; solo i particolari che escono al massimo una volta su cinque
export const PESI = {"aurora":306,"civilta":254,"asse":406,"dueSoli":506,"nebulosa":606,"mariLuce":702,"esagono":697,"oceanoGlobale":697,"cromatico":799,"pianetaCitta":989,"lunaGigante":355,"anelliImmensi":473,"giornoLampo":464,"giornoEterno":465,"colosso":464,"minuscolo":464,"rigoglio":554,"treCicloni":413,"cieloCoperto":557};
export const SOGLIE = [355,667,971,1358,1849];
export const QUOTE = [0.578022,0.242359,0.119914,0.0446797,0.0130167,0.00200833];
// nomi del campione con almeno i × PASSO punti; dove sarebbero meno di 30 la tabella finisce
export const CODA = [3000000,1673049,1673049,1673049,1673049,1673049,1673049,1673049,1673049,1673049,1673049,1446984,1446984,1265933,1265933,1141664,1141664,989067,989067,702764,702764,661765,661765,611261,611261,570236,570236,515037,489501,422326,416150,363394,350633,275712,270203,245545,227978,215894,196049,174064,172340,154901,152246,136012,134650,120819,110801,96466,89199,78225,70195,60386,53121,49775,45537,41833,38824,36046,32925,30651,28347,25846,23166,21766,18511,17537,14936,13796,11581,10567,9080,8572,7378,6891,5968,5621,5031,4638,4154,3869,3323,3061,2643,2431,2143,1925,1664,1518,1311,1195,1043,937,794,725,642,587,512,478,422,372,323,288,250,222,195,176,159,141,119,112,96,88,80,70,63,59,52,47,45,40,33,31];
