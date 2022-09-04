module.exports = {
  listingTypes: {
    RENT_LEASE: 'rentlease',
    SELL_APARTMENT: 'sellapartment',
    SELL_PROJECT: 'sellproject',
  },
  apartmentType: ['1rk', '1bhk', '2bhk', '3bhk', '4bhk'],
  otherRooms: ['poojaRoom', 'studyRoom', 'servantRoom', 'storeRoom'],
  furnishing: ['furnished', 'semiFurnished', 'unFurnished'],
  ageOfProperty: ['0-1yrs', '1-5yrs', '5-10yrs', '10+yrs'],
  willingToRentOutTo: [
    'family',
    'singleMen',
    'singleWomen',
    'unmarriedCouples',
  ],
  availabilityStatus: ['readyToMove', 'underConstruction'],
  ownershipType: ['freehold', 'leasehold', 'cooperativeSociety'],
  listingState  : {
    SUBMITTED : 'Submitted', 
    APPROVED : 'Approved', 
    REJECTED : 'Rejected', 
    DEACTIVATED : 'Deactivated'
  }
};
