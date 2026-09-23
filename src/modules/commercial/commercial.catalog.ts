export type CommercialCurrency = "USD" | "GBP" | "PKR";

export type CommercialPackage = {
  slug: string;
  name: string;
  price: number;
  currency: CommercialCurrency;
};

export type CommercialAddOn = {
  slug: string;
  name: string;
  price: number;
  currency: CommercialCurrency;
};

export type CommercialJurisdiction = {
  slug: string;
  name: string;
  filingFee: number;
  renewalFee: number;
  renewalDue: string;
  currency: "USD";
};

export type CommercialService = {
  slug: string;
  name: string;
  currency: CommercialCurrency;
  price?: number;
  packages?: CommercialPackage[];
  addOns?: CommercialAddOn[];
  jurisdictions?: CommercialJurisdiction[];
  variants?: CommercialStandaloneVariant[];
};

export type CommercialStandaloneVariant = {
  variantSlug: string;
  name: string;
  price: number;
  currency: "USD";
};

export const commercialCatalog: CommercialService[] = [
  {
    slug: "usa-llc",
    name: "USA LLC Formation",
    currency: "USD",
    packages: [
      { slug: "basic", name: "Basic", price: 125, currency: "USD" },
      { slug: "standard", name: "Standard", price: 174, currency: "USD" },
      { slug: "premium", name: "Premium", price: 280, currency: "USD" },
    ],
    addOns: [
      { slug: "wise-account-setup", name: "Wise Account Setup", price: 75, currency: "USD" },
    ],
    jurisdictions: [
      {
        slug: "alabama",
        name: "Alabama",
        filingFee: 200,
        renewalFee: 100,
        renewalDue: "15 April",
        currency: "USD",
      },
      {
        slug: "alaska",
        name: "Alaska",
        filingFee: 250,
        renewalFee: 100,
        renewalDue: "2 January",
        currency: "USD",
      },
      {
        slug: "arizona",
        name: "Arizona",
        filingFee: 50,
        renewalFee: 0,
        renewalDue: "Not required",
        currency: "USD",
      },
      {
        slug: "arkansas",
        name: "Arkansas",
        filingFee: 45,
        renewalFee: 150,
        renewalDue: "1 May",
        currency: "USD",
      },
      {
        slug: "california",
        name: "California",
        filingFee: 70,
        renewalFee: 820,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "colorado",
        name: "Colorado",
        filingFee: 50,
        renewalFee: 25,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "connecticut",
        name: "Connecticut",
        filingFee: 120,
        renewalFee: 80,
        renewalDue: "31 March",
        currency: "USD",
      },
      {
        slug: "delaware",
        name: "Delaware",
        filingFee: 110,
        renewalFee: 300,
        renewalDue: "1 June",
        currency: "USD",
      },
      {
        slug: "florida",
        name: "Florida",
        filingFee: 125,
        renewalFee: 138.75,
        renewalDue: "1 May",
        currency: "USD",
      },
      {
        slug: "georgia",
        name: "Georgia",
        filingFee: 100,
        renewalFee: 50,
        renewalDue: "1 April",
        currency: "USD",
      },
      {
        slug: "hawaii",
        name: "Hawaii",
        filingFee: 50,
        renewalFee: 15,
        renewalDue: "Anniversary+qtr",
        currency: "USD",
      },
      {
        slug: "idaho",
        name: "Idaho",
        filingFee: 100,
        renewalFee: 0,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "illinois",
        name: "Illinois",
        filingFee: 150,
        renewalFee: 75,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "indiana",
        name: "Indiana",
        filingFee: 95,
        renewalFee: 131,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "iowa",
        name: "Iowa",
        filingFee: 50,
        renewalFee: 30,
        renewalDue: "1 April",
        currency: "USD",
      },
      {
        slug: "kansas",
        name: "Kansas",
        filingFee: 165,
        renewalFee: 500,
        renewalDue: "15 April",
        currency: "USD",
      },
      {
        slug: "kentucky",
        name: "Kentucky",
        currency: "USD",
        filingFee: 40,
        renewalFee: 15,
        renewalDue: "30 June",
      },
      {
        slug: "louisiana",
        name: "Louisiana",
        filingFee: 105,
        renewalFee: 35,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "maine",
        name: "Maine",
        filingFee: 175,
        renewalFee: 85,
        renewalDue: "1 June",
        currency: "USD",
      },
      {
        slug: "maryland",
        name: "Maryland",
        filingFee: 100,
        renewalFee: 300,
        renewalDue: "15 April",
        currency: "USD",
      },
      {
        slug: "massachusetts",
        name: "Massachusetts",
        filingFee: 500,
        renewalFee: 500,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "michigan",
        name: "Michigan",
        filingFee: 50,
        renewalFee: 25,
        renewalDue: "15 February",
        currency: "USD",
      },
      {
        slug: "minnesota",
        name: "Minnesota",
        filingFee: 155,
        renewalFee: 0,
        renewalDue: "31 December",
        currency: "USD",
      },
      {
        slug: "mississippi",
        name: "Mississippi",
        filingFee: 50,
        renewalFee: 0,
        renewalDue: "1 April",
        currency: "USD",
      },
      {
        slug: "missouri",
        name: "Missouri",
        filingFee: 52,
        renewalFee: 0,
        renewalDue: "Not required",
        currency: "USD",
      },
      {
        slug: "montana",
        name: "Montana",
        filingFee: 35,
        renewalFee: 20,
        renewalDue: "15 April",
        currency: "USD",
      },
      {
        slug: "nebraska",
        name: "Nebraska",
        filingFee: 100,
        renewalFee: 13,
        renewalDue: "1 April",
        currency: "USD",
      },
      {
        slug: "nevada",
        name: "Nevada",
        filingFee: 425,
        renewalFee: 350,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "new-hampshire",
        name: "New Hampshire",
        filingFee: 100,
        renewalFee: 100,
        renewalDue: "1 April",
        currency: "USD",
      },
      {
        slug: "new-jersey",
        name: "New Jersey",
        filingFee: 130,
        renewalFee: 75,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "new-mexico",
        name: "New Mexico",
        filingFee: 50,
        renewalFee: 0,
        renewalDue: "Not required",
        currency: "USD",
      },
      {
        slug: "new-york",
        name: "New York",
        filingFee: 200,
        renewalFee: 9,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "north-carolina",
        name: "North Carolina",
        filingFee: 125,
        renewalFee: 202,
        renewalDue: "15 April",
        currency: "USD",
      },
      {
        slug: "north-dakota",
        name: "North Dakota",
        filingFee: 135,
        renewalFee: 50,
        renewalDue: "15 November",
        currency: "USD",
      },
      {
        slug: "ohio",
        name: "Ohio",
        filingFee: 99,
        renewalFee: 0,
        renewalDue: "Not required",
        currency: "USD",
      },
      {
        slug: "oklahoma",
        name: "Oklahoma",
        filingFee: 100,
        renewalFee: 25,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "oregon",
        name: "Oregon",
        filingFee: 100,
        renewalFee: 100,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "pennsylvania",
        name: "Pennsylvania",
        filingFee: 125,
        renewalFee: 7,
        renewalDue: "30 September",
        currency: "USD",
      },
      {
        slug: "rhode-island",
        name: "Rhode Island",
        filingFee: 150,
        renewalFee: 50,
        renewalDue: "1 May",
        currency: "USD",
      },
      {
        slug: "south-carolina",
        name: "South Carolina",
        filingFee: 110,
        renewalFee: 0,
        renewalDue: "Not required",
        currency: "USD",
      },
      {
        slug: "south-dakota",
        name: "South Dakota",
        filingFee: 150,
        renewalFee: 55,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "tennessee",
        name: "Tennessee",
        filingFee: 300,
        renewalFee: 300,
        renewalDue: "1 April",
        currency: "USD",
      },
      {
        slug: "texas",
        name: "Texas",
        filingFee: 300,
        renewalFee: 0,
        renewalDue: "15 May",
        currency: "USD",
      },
      {
        slug: "utah",
        name: "Utah",
        filingFee: 76,
        renewalFee: 18,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "vermont",
        name: "Vermont",
        filingFee: 155,
        renewalFee: 45,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "virginia",
        name: "Virginia",
        filingFee: 100,
        renewalFee: 50,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "washington",
        name: "Washington",
        filingFee: 200,
        renewalFee: 60,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "west-virginia",
        name: "West Virginia",
        filingFee: 100,
        renewalFee: 25,
        renewalDue: "1 July",
        currency: "USD",
      },
      {
        slug: "wisconsin",
        name: "Wisconsin",
        filingFee: 130,
        renewalFee: 25,
        renewalDue: "Anniversary",
        currency: "USD",
      },
      {
        slug: "wyoming",
        name: "Wyoming",
        filingFee: 102,
        renewalFee: 60,
        renewalDue: "Anniversary",
        currency: "USD",
      },
    ],
  },
  {
    slug: "itin-processing",
    name: "ITIN",
    currency: "USD",
    variants: [{ variantSlug: "itin", name: "ITIN", price: 150, currency: "USD" }],
  },
  {
    slug: "ein-without-ssn",
    name: "International EIN",
    currency: "USD",
    variants: [
      { variantSlug: "resident", name: "International EIN — Resident", price: 10, currency: "USD" },
      {
        variantSlug: "non-resident",
        name: "International EIN — Non-Resident",
        price: 25,
        currency: "USD",
      },
    ],
  },
  {
    slug: "uk-ltd",
    name: "UK LTD Formation",
    currency: "GBP",
    packages: [
      { slug: "standard", name: "Standard", price: 165, currency: "GBP" },
      { slug: "premium", name: "Premium", price: 225, currency: "GBP" },
    ],
  },
  {
    slug: "uk-director-id-verification",
    name: "UK Director ID Verification",
    currency: "GBP",
    price: 25,
  },
  { slug: "uk-address", name: "UK Address", currency: "GBP", price: 40 },
  {
    slug: "uk-corporate-tax",
    name: "UK Corporate Tax Filing (CT600)",
    currency: "GBP",
    price: 125,
  },
  { slug: "uk-confirmation-statement", name: "Confirmation Statement", currency: "GBP", price: 75 },
  { slug: "uk-vat-registration", name: "VAT Registration", currency: "GBP", price: 49 },
  { slug: "uk-vat-filing", name: "VAT Return Filing", currency: "GBP", price: 70 },
  {
    slug: "pak-private-company-registration",
    name: "Private Company Registration",
    currency: "PKR",
    price: 5000,
  },
  { slug: "pak-llp-registration", name: "LLP Registration", currency: "PKR", price: 20000 },
  {
    slug: "pak-sole-business-registration",
    name: "Sole Business Registration",
    currency: "PKR",
    price: 1500,
  },
  { slug: "pak-ntn-registration", name: "NTN Registration", currency: "PKR", price: 500 },
  { slug: "pak-become-filer", name: "Become Filer", currency: "PKR", price: 2000 },
  { slug: "pak-salary-return", name: "Salary Return", currency: "PKR", price: 1500 },
  { slug: "pak-business-return", name: "Business Return", currency: "PKR", price: 2500 },
  { slug: "pak-dnfbp-certificate", name: "DNFBP Certificate", currency: "PKR", price: 10000 },
  { slug: "pak-pseb", name: "PSEB Registration", currency: "PKR", price: 5000 },
  { slug: "pak-psw", name: "PSW Registration", currency: "PKR", price: 5000 },
];

export function getCommercialService(slug: string): CommercialService | undefined {
  return commercialCatalog.find((service) => service.slug === slug);
}
