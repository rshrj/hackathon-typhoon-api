const mongoose = require('mongoose');
const enums = require('./enums');

const RentLeaseSchema = new mongoose.Schema({
  societyName: {
    type: String,
  },
  location: {
    type: String,
    required: true,
  },
  landmark: {
    type: String,
    required: true,
  },
  apartmentType: {
    type: String,
    required: true,
    enum: [...enums.apartmentType],
  },
  rent: {
    type: String,
    required: true,
  },
  electricityIncluded: {
    type: Boolean,
    default: false,
  },
  priceNegotiable: {
    type: Boolean,
    default: false,
  },
  deposit: {
    type: String,
    required: true,
  },
  numBathrooms: {
    type: String,
    required: true,
  },
  numBalconies: {
    type: String,
    required: true,
  },
  carpetArea: {
    type: String,
    required: true,
  },
  builtUpArea: {
    type: String,
  },
  superBuiltUpArea: {
    type: String,
  },
  otherRooms: {
    type: [String],
    enum: [...enums.otherRooms],
  },
  furnishing: {
    type: String,
    required: true,
    enum: [...enums.furnishing],
  },
  coveredParking: {
    type: Number,
    default: 0,
  },
  openParking: {
    type: Number,
    default: 0,
  },
  totalFloors: {
    type: String,
    required: true,
  },
  propertyOnFloor: {
    type: String,
    required: true,
  },
  ageOfProperty: {
    type: String,
    required: true,
    enum: [...enums.ageOfProperty],
  },
  availableFrom: {
    type: String,
    required: true,
  },
  willingToRentOutTo: {
    type: [String],
    required: true,
    enum: [...enums.willingToRentOutTo],
  },
  pictures: {
    type: [String],
    required: true,
  },
  featuredPicture: {
    type: String,
  },
  videoLink: {
    type: String,
  },
});

module.exports = RentLeaseSchema;
