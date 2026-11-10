// nomi.js — i nomi del dado: mitologie, stelle e nomi comuni di tante culture, più nomi inventati.
// Mai persone private: il progetto è pubblico.
import { componi } from './nome.js';

export const NOMI = [
  ...new Set(
    `
Atena Zeus Era Apollo Artemide Ade Poseidone Ermes Afrodite Ares Efesto Demetra Dioniso Persefone Estia Gaia Urano
Crono Rea Oceano Teti Iperione Febe Leto Asteria Ecate Selene Eos Elio Nike Iride Ebe Temi Mnemosine Calliope Clio
Erato Euterpe Talia Tersicore Urania Polimnia Melpomene Atlante Prometeo Epimeteo Pandora Ulisse Penelope Telemaco
Achille Ettore Andromaca Enea Didone Orfeo Euridice Icaro Dedalo Circe Calipso Medusa Teseo Arianna Fedra Giasone
Medea Ercole Castore Polluce Elena Paride Cassandra Antigone Edipo Narciso Eco Dafne Psiche Eros Morfeo Ipno Nemesi
Tiche Atalanta Perseo Andromeda Cassiopea Pegaso Chirone Galatea Leda Europa Callisto Ganimede Tritone Proteo Nereo
Anfitrite Pan Eolo Borea Zefiro Aracne Niobe Alcione Ifigenia Elettra Oreste Patroclo Aiace Nestore Argo
Minerva Diana Giunone Vesta Cerere Bacco Vulcano Aurora Giano Fauno Flora Pomona Saturno Marte Venere Mercurio
Nettuno Plutone Giove Luna Sole Terra Fortuna Concordia Silvano Quirino Romolo Remo Lavinia Camilla Turno
Odino Thor Freya Frigg Loki Baldr Tyr Heimdall Idunn Bragi Skadi Njord Freyr Sif Mimir Ymir Sleipnir Yggdrasil
Valhalla Brunilde Sigfrido Iside Osiride Ra Horus Anubi Thot Bastet Sekhmet Hathor Nut Geb Shu Tefnut Ptah Amon
Maat Sobek Neith Khonsu Nefti Ishtar Inanna Marduk Enki Enlil Tiamat Gilgamesh Enkidu Shamash Nabu Ninhursag
Indra Agni Surya Vayu Varuna Lakshmi Sarasvati Parvati Shiva Vishnu Brahma Ganesha Durga Rama Sita Krishna Hanuman
Soma Ushas Garuda Brigid Lugh Dagda Morrigan Danu Epona Cernunnos Taranis Belenos Rhiannon Arianrhod Ceridwen
Taliesin Merlino Morgana Artù Ginevra Lancillotto Tristano Isotta Avalon Perun Veles Mokosh Svarog Lada Jarilo
Stribog Zorja Dazbog Amaterasu Tsukuyomi Susanoo Izanagi Izanami Inari Raijin Fujin Benzaiten Kaguya Ebisu Nuwa
Fuxi Chang'e Houyi Pangu Mazu Wukong Xihe Zhurong Quetzalcoatl Tlaloc Xochiquetzal Tonatiuh Coatlicue Itzamna
Ixchel Kukulkan Inti Pachamama Viracocha Quilla Anansi Oshun Yemoja Shango Olokun Obatala Oya Mawu Nyame Maui Pele
Tangaroa Hina Rangi Tane
Vega Sirio Orione Lira Altair Deneb Rigel Betelgeuse Aldebaran Antares Polaris Arturo Spica Capella Canopo Procione
Regolo Fomalhaut Mira Maia Merope Taigete Celeno Achernar Bellatrix Mintaka Alnilam Algol Mizar Alcor Thuban Hadar
Acrux Sadr Albireo Nashira
Luca Sofia Marco Giulia Lorenzo Chiara Matteo Francesca Davide Elisa Martina Leonardo Beatrice Tommaso Pietro Anna
Paolo Laura Mateo Lucia Hugo Emma Liam Olivia Noah Mia Leon Lena Ivan Olga Nadia Sasha Omar Leila Amir Yasmin Arjun
Priya Ravi Anika Kenji Aiko Hana Ren Mei Wei Lin Kwame Amara Zola Kofi Nia Tariq Zara Ines Diego Valentina Santiago
Camila Rosa Ana Pablo Noor Malik Ayla Elif Emre Nora Erik Astrid Lars Ingrid Mila Teo Iris Nina Ada Lea Livia Bruno
Carlo Dario Enzo Ugo Viola Marta Sara Irene Alma
`
      .trim()
      .split(/\s+/),
  ),
];

/** Un nome da provare: metà delle volte dalla lista, metà inventato con due o tre sillabe. */
export function nomeACaso(caso = Math.random) {
  if (caso() < 0.5) return NOMI[Math.floor(caso() * NOMI.length)];
  return componi(() => Math.floor(caso() * 4294967296));
}
