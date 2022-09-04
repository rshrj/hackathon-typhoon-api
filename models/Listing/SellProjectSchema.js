const mongoose = require('mongoose');
const enums = require('./enums');

const ApartmentSchema = new mongoose.Schema({
  apartmentType: {
    type: String,
    required: true,
    enum: [...enums.apartmentType]
  },
  price: {
    type: String,
    required: true
  },
  pricePerSqFt: {
    type: String,
    required: true
  },
  allInclusivePrice: {
    type: Boolean,
    default: false
  },
  taxAndGovtChargesExcluded: {
    type: Boolean,
    default: true
  },
  priceNegotiable: {
    type: Boolean,
    default: false
  },
  numBathrooms: {
    type: String,
    required: true
  },
  numBalconies: {
    type: String,
    required: true
  },
  carpetArea: {
    type: String,
    required: true
  },
  builtUpArea: {
    type: String
  },
  superBuiltUpArea: {
    type: String
  },
  otherRooms: {
    type: [String],
    enum: [...enums.otherRooms]
  },
  furnishing: {
    type: String,
    required: true,
    enum: [...enums.furnishing]
  }
});

const SellProjectSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true
  },
  landmark: {
    type: String,
    required: true
  },
  apartmentTypes: {
    type: [String],
    required: true,
    enum: [...enums.apartmentType]
  },
  units: [ApartmentSchema],
  coveredParking: {
    type: Number,
    default: 0
  },
  openParking: {
    type: Number,
    default: 0
  },
  totalFloors: {
    type: String,
    required: true
  },
  ageOfProperty: {
    type: String,
    required: true,
    enum: [...enums.ageOfProperty]
  },
  availabilityStatus: {
    type: String,
    required: true,
    enum: [...enums.availabilityStatus]
  },
  possessionBy: {
    type: String
  },
  ownershipType: {
    type: String,
    required: true,
    enum: [...enums.ownershipType]
  },
  usp: {
    type: String
  },
  pictures: {
    type: [String],
    required: true
  },
  featuredPicture: {
    type: String
  },
  brochureLink: {
    type: String
  },
  videoLink: {
    type: String
  }
});

module.exports = SellProjectSchema;
