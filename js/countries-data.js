/**
 * countries-data.js — Temporary Sample Country Dataset
 * ─────────────────────────────────────────────────────────────
 * Responsibility:
 *   Provides the initial demonstration dataset of 8 sample countries.
 *   Conforms to REST Countries API v3 model for smooth forward compatibility,
 *   supporting cards, search, filters, and Phase 7 details modal.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const SAMPLE_COUNTRIES = [
  {
    cca2: 'IN',
    cca3: 'IND',
    name: {
      common: 'India',
      official: 'Republic of India'
    },
    capital: ['New Delhi'],
    region: 'Asia',
    subregion: 'Southern Asia',
    population: 1450000000,
    area: 3287590,
    independent: true,
    landlocked: false,
    languages: { hin: 'Hindi', eng: 'English' },
    currencies: { INR: { name: 'Indian Rupee', symbol: '₹' } },
    timezones: ['UTC+05:30'],
    idd: { root: '+9', suffixes: ['1'] },
    borders: [],
    maps: {
      googleMaps: 'https://goo.gl/maps/WSkGDDLtkRdQUioDA',
      openStreetMaps: 'https://www.openstreetmap.org/relation/304716'
    },
    flags: {
      svg: './assets/images/flags/in.svg',
      png: './assets/images/flags/in.svg',
      alt: 'Flag of India'
    },
    description: 'Vibrant land of rich heritage, diverse cultures, and profound history.'
  },
  {
    cca2: 'JP',
    cca3: 'JPN',
    name: {
      common: 'Japan',
      official: 'Japan'
    },
    capital: ['Tokyo'],
    region: 'Asia',
    subregion: 'Eastern Asia',
    population: 123000000,
    area: 377975,
    independent: true,
    landlocked: false,
    languages: { jpn: 'Japanese' },
    currencies: { JPY: { name: 'Japanese Yen', symbol: '¥' } },
    timezones: ['UTC+09:00'],
    idd: { root: '+8', suffixes: ['1'] },
    borders: [],
    maps: {
      googleMaps: 'https://goo.gl/maps/7dhScnMGBqiExAe69',
      openStreetMaps: 'https://www.openstreetmap.org/relation/382313'
    },
    flags: {
      svg: './assets/images/flags/jp.svg',
      png: './assets/images/flags/jp.svg',
      alt: 'Flag of Japan'
    },
    description: 'Island nation blending ancient traditions with cutting-edge technology.'
  },
  {
    cca2: 'FR',
    cca3: 'FRA',
    name: {
      common: 'France',
      official: 'French Republic'
    },
    capital: ['Paris'],
    region: 'Europe',
    subregion: 'Western Europe',
    population: 68000000,
    area: 551695,
    independent: true,
    landlocked: false,
    languages: { fra: 'French' },
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    timezones: ['UTC+01:00'],
    idd: { root: '+3', suffixes: ['3'] },
    borders: ['DEU'],
    maps: {
      googleMaps: 'https://goo.gl/maps/g7QxxSFUmInitVG5A',
      openStreetMaps: 'https://www.openstreetmap.org/relation/1403916'
    },
    flags: {
      svg: './assets/images/flags/fr.svg',
      png: './assets/images/flags/fr.svg',
      alt: 'Flag of France'
    },
    description: 'Renowned European center of art, culinary excellence, and architecture.'
  },
  {
    cca2: 'DE',
    cca3: 'DEU',
    name: {
      common: 'Germany',
      official: 'Federal Republic of Germany'
    },
    capital: ['Berlin'],
    region: 'Europe',
    subregion: 'Western Europe',
    population: 84000000,
    area: 357022,
    independent: true,
    landlocked: false,
    languages: { deu: 'German' },
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    timezones: ['UTC+01:00'],
    idd: { root: '+4', suffixes: ['9'] },
    borders: ['FRA'],
    maps: {
      googleMaps: 'https://goo.gl/maps/mD9FNcFugMCJ2gkc6',
      openStreetMaps: 'https://www.openstreetmap.org/relation/51477'
    },
    flags: {
      svg: './assets/images/flags/de.svg',
      png: './assets/images/flags/de.svg',
      alt: 'Flag of Germany'
    },
    description: 'Economic and technological powerhouse at the heart of Europe.'
  },
  {
    cca2: 'US',
    cca3: 'USA',
    name: {
      common: 'United States',
      official: 'United States of America'
    },
    capital: ['Washington, D.C.'],
    region: 'Americas',
    subregion: 'North America',
    population: 340000000,
    area: 9833520,
    independent: true,
    landlocked: false,
    languages: { eng: 'English' },
    currencies: { USD: { name: 'United States Dollar', symbol: '$' } },
    timezones: ['UTC-05:00', 'UTC-06:00', 'UTC-07:00', 'UTC-08:00'],
    idd: { root: '+1', suffixes: [''] },
    borders: [],
    maps: {
      googleMaps: 'https://goo.gl/maps/e8M246zY4BSjkjAv6',
      openStreetMaps: 'https://www.openstreetmap.org/relation/148838'
    },
    flags: {
      svg: './assets/images/flags/us.svg',
      png: './assets/images/flags/us.svg',
      alt: 'Flag of the United States'
    },
    description: 'Vast nation of diverse landscapes, cultural influence, and historical milestones.'
  },
  {
    cca2: 'AU',
    cca3: 'AUS',
    name: {
      common: 'Australia',
      official: 'Commonwealth of Australia'
    },
    capital: ['Canberra'],
    region: 'Oceania',
    subregion: 'Australia and New Zealand',
    population: 27000000,
    area: 7692024,
    independent: true,
    landlocked: false,
    languages: { eng: 'English' },
    currencies: { AUD: { name: 'Australian Dollar', symbol: '$' } },
    timezones: ['UTC+08:00', 'UTC+09:30', 'UTC+10:00'],
    idd: { root: '+6', suffixes: ['1'] },
    borders: [],
    maps: {
      googleMaps: 'https://goo.gl/maps/DcjdaKTi6vJJFUAC9',
      openStreetMaps: 'https://www.openstreetmap.org/relation/80500'
    },
    flags: {
      svg: './assets/images/flags/au.svg',
      png: './assets/images/flags/au.svg',
      alt: 'Flag of Australia'
    },
    description: 'Continent-island famed for its stunning natural wonders and unique wildlife.'
  },
  {
    cca2: 'BR',
    cca3: 'BRA',
    name: {
      common: 'Brazil',
      official: 'Federative Republic of Brazil'
    },
    capital: ['Brasília'],
    region: 'Americas',
    subregion: 'South America',
    population: 212000000,
    area: 8515767,
    independent: true,
    landlocked: false,
    languages: { por: 'Portuguese' },
    currencies: { BRL: { name: 'Brazilian Real', symbol: 'R$' } },
    timezones: ['UTC-05:00', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00'],
    idd: { root: '+5', suffixes: ['5'] },
    borders: [],
    maps: {
      googleMaps: 'https://goo.gl/maps/waCKk2FpmBavK1B86',
      openStreetMaps: 'https://www.openstreetmap.org/relation/59470'
    },
    flags: {
      svg: './assets/images/flags/br.svg',
      png: './assets/images/flags/br.svg',
      alt: 'Flag of Brazil'
    },
    description: 'Largest South American nation, home to the Amazon and vibrant festivities.'
  },
  {
    cca2: 'ZA',
    cca3: 'ZAF',
    name: {
      common: 'South Africa',
      official: 'Republic of South Africa'
    },
    capital: ['Pretoria'],
    region: 'Africa',
    subregion: 'Southern Africa',
    population: 63000000,
    area: 1221037,
    independent: true,
    landlocked: false,
    languages: { afr: 'Afrikaans', eng: 'English', xho: 'Xhosa', zul: 'Zulu' },
    currencies: { ZAR: { name: 'South African Rand', symbol: 'R' } },
    timezones: ['UTC+02:00'],
    idd: { root: '+2', suffixes: ['7'] },
    borders: [],
    maps: {
      googleMaps: 'https://goo.gl/maps/CLCZ1R8Uz1KpYhRMA',
      openStreetMaps: 'https://www.openstreetmap.org/relation/102090'
    },
    flags: {
      svg: './assets/images/flags/za.svg',
      png: './assets/images/flags/za.svg',
      alt: 'Flag of South Africa'
    },
    description: 'The Rainbow Nation boasting rich diversity, dramatic scenery, and wildlife.'
  }
];

// Attach to window for global access across IIFE modules
if (typeof window !== 'undefined') {
  window.SAMPLE_COUNTRIES = SAMPLE_COUNTRIES;
}
