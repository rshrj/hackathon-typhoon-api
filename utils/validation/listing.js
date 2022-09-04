const Joi = require('joi');
const enums = require('../../models/Listing/enums');

const RentLeaseValidation = Joi.object({
  name: Joi.string(),
  societyName: Joi.string(),
  location: Joi.string().required(),
  landmark: Joi.string().required(),
  apartmentType: Joi.string()
    .valid(...enums.apartmentType)
    .required(),
  rent: Joi.string().required(),
  electricityIncluded: Joi.boolean(),
  priceNegotiable: Joi.boolean(),
  deposit: Joi.string().required(),
  numBathrooms: Joi.string().required(),
  numBalconies: Joi.string().required(),
  carpetArea: Joi.string().required(),
  builtUpArea: Joi.string().allow('').optional(),
  superBuiltUpArea: Joi.string().allow('').optional(),
  otherRooms: Joi.array().items(Joi.string().valid(...enums.otherRooms)),
  furnishing: Joi.string()
    .valid(...enums.furnishing)
    .required(),
  coveredParking: Joi.number(),
  openParking: Joi.number(),
  totalFloors: Joi.string().required(),
  propertyOnFloor: Joi.string().required(),
  ageOfProperty: Joi.string()
    .valid(...enums.ageOfProperty)
    .required(),
  availableFrom: Joi.string().required(),
  willingToRentOutTo: Joi.array()
    .items(
      Joi.string()
        .valid(...enums.willingToRentOutTo)
        .required()
    )
    .min(1)
    .required(),
  pictures: Joi.array().items(Joi.string().required()).min(1).required(),
  featuredPicture: Joi.string(),
  videoLink: Joi.string().allow('').optional()
});

const SellApartmentValidation = Joi.object({
  name: Joi.string(),
  societyName: Joi.string(),
  location: Joi.string().required(),
  landmark: Joi.string().required(),
  apartmentType: Joi.string()
    .valid(...enums.apartmentType)
    .required(),
  price: Joi.string().required(),
  pricePerSqFt: Joi.string().required(),
  allInclusivePrice: Joi.boolean(),
  taxAndGovtChargesExcluded: Joi.boolean(),
  priceNegotiable: Joi.boolean(),
  numBathrooms: Joi.string().required(),
  numBalconies: Joi.string().required(),
  carpetArea: Joi.string().required(),
  builtUpArea: Joi.string().allow(''),
  superBuiltUpArea: Joi.string().allow(''),
  otherRooms: Joi.array().items(Joi.string().valid(...enums.otherRooms)),
  furnishing: Joi.string()
    .valid(...enums.furnishing)
    .required(),
  coveredParking: Joi.number(),
  openParking: Joi.number(),
  totalFloors: Joi.string().required(),
  propertyOnFloor: Joi.string().required(),
  ageOfProperty: Joi.string()
    .valid(...enums.ageOfProperty)
    .required(),
  availabilityStatus: Joi.string()
    .valid(...enums.availabilityStatus)
    .required(),
  possessionBy: Joi.when('availabilityStatus', {
    is: 'underConstruction',
    then: Joi.date().required(),
    otherwise: Joi.string().optional()
  }),
  ownershipType: Joi.string()
    .valid(...enums.ownershipType)
    .required(),
  usp: Joi.string(),
  pictures: Joi.array().items(Joi.string().required()).min(1).required(),
  featuredPicture: Joi.string(),
  videoLink: Joi.string().allow('').optional()
});

const SellProjectValidation = Joi.object({
  name: Joi.string().required().label('Project Name'),
  location: Joi.string().required(),
  landmark: Joi.string().required(),
  apartmentTypes: Joi.array().items(
    Joi.string()
      .valid(...enums.apartmentType)
      .required()
  ),
  units: Joi.array().items(
    Joi.object({
      _id: Joi.string(),
      apartmentType: Joi.string()
        .valid(...enums.apartmentType)
        .required(),
      price: Joi.string().required(),
      pricePerSqFt: Joi.string().required(),
      allInclusivePrice: Joi.boolean(),
      taxAndGovtChargesExcluded: Joi.boolean(),
      priceNegotiable: Joi.boolean(),
      numBathrooms: Joi.string().required(),
      numBalconies: Joi.string().required(),
      carpetArea: Joi.string().required(),
      builtUpArea: Joi.string().allow(''),
      superBuiltUpArea: Joi.string().allow(''),
      otherRooms: Joi.array().items(Joi.string().valid(...enums.otherRooms)),
      furnishing: Joi.string()
        .valid(...enums.furnishing)
        .required()
    })
  ),
  coveredParking: Joi.number(),
  openParking: Joi.number(),
  totalFloors: Joi.string().required(),
  ageOfProperty: Joi.string()
    .valid(...enums.ageOfProperty)
    .required(),
  availabilityStatus: Joi.string()
    .valid(...enums.availabilityStatus)
    .required(),
  possessionBy: Joi.when('availabilityStatus', {
    is: 'underConstruction',
    then: Joi.string().required(),
    otherwise: Joi.string()
  }),
  ownershipType: Joi.string()
    .valid(...enums.ownershipType)
    .required(),
  usp: Joi.string(),
  pictures: Joi.array().items(Joi.string().required()).min(1).required(),
  featuredPicture: Joi.string(),
  brochureLink: Joi.string().allow('').optional(),
  videoLink: Joi.string().allow('').optional()
});

const FuzzySearchValidation = Joi.object({
  query: Joi.string().allow(''),
  type: Joi.array()
    .items(
      Joi.string()
        .valid(...Object.values(enums.listingTypes))
        .required()
    )
    .min(1)
    .required()
});

const ParticularListingValidation = Joi.object({
  size: Joi.number(),
  page: Joi.number(),
  type: Joi.array()
    .items(
      Joi.string()
        .valid(...Object.values(enums.listingTypes))
        .required()
    )
    .min(1)
    .required()
});

module.exports = {
  RentLeaseValidation,
  SellApartmentValidation,
  SellProjectValidation,
  FuzzySearchValidation,
  ParticularListingValidation
};
