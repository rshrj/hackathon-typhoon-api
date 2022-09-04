const router = require('express').Router();
const mongoose = require('mongoose');
const FuzzySearch = require('fuzzy-search');
const _ = require('lodash');
const config = require('config');

const Listing = require('../models/Listing');
const {
  listingTypes: { RENT_LEASE, SELL_APARTMENT, SELL_PROJECT },
  listingState: { SUBMITTED, APPROVED, REJECTED, DEACTIVATED },
} = require('../models/Listing/enums');
const {
  RentLeaseValidation,
  SellApartmentValidation,
  SellProjectValidation,
  FuzzySearchValidation,
  ParticularListingValidation,
} = require('../utils/validation/listing');
const { CUSTOMER, ADMIN } = require('../models/User/roles');
const User = require('../models/User');
const auth = require('../utils/auth/index');
const checkVerified = require('../utils/auth/checkVerified');
const checkError = require('../utils/error/checkError');
const objToArray = require('../utils/helpers/objToArray');
const decorateProject = require('../utils/helpers/decorateProject');
const {
  findAndAttach,
  findAndDelete,
} = require('../utils/uploads/attachUpload');
const sendMail = require('../utils/mailing/sendmail');

async function onListingSubmittedEmail(id) {
  const user = await User.findById(id);
  let customerName = user.name.first + ' ' + user.name.last;

  //Email to Customer
  await sendMail({
    to: user.email,
    from: config.get('env.smtp.user'),
    subject: 'Your listing has been successfully submitted!',
    template: 'newListingCustomer',
    templateVars: {
      name: customerName,
    },
  });

  //Email to Admin
  await sendMail({
    to: config.get('env.adminEmail'),
    from: config.get('env.smtp.user'),
    subject: 'Approval required for new listing',
    template: 'newListingAdmin',
    templateVars: {
      name: customerName,
    },
  });
}

/*
  All @routes
  =>   GET listings/featured
  =>   GET listings/fuzzy
  =>   GET listings/particular
  =>   GET listings/all
  =>   GET listings/:listingId
  =>   GET listings/related/:listingId
  =>   POST listings/:listingId
  =>   POST listings/user
  =>   POST listings/add/rentlease
  =>   POST listings/add/sellapartment
  =>   POST listings/add/sellproject
  =>   PUT listings/updateState
  =>   DELETE listings/delete
*/

// @route   GET listings/featured
// @desc    To fetch featured properties.
// @access  Public
router.get('/featured', async (req, res) => {
  const buySize = 8;
  const rentSize = 4;

  try {
    let buy = await Listing.find({
      state: APPROVED,
      type: { $in: [SELL_APARTMENT, SELL_PROJECT] },
    })
      .sort('-createdAt')
      .limit(buySize);

    let rent = await Listing.find({ state: APPROVED, type: RENT_LEASE })
      .sort('-createdAt')
      .limit(rentSize);

    return res.json({
      success: true,
      payload: {
        buy: buy.map((listing) =>
          listing.type === SELL_PROJECT ? decorateProject(listing) : listing
        ),
        rent,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

// @route   GET listings/fuzzy
// @desc    To fetch particular type of listings with query
// @access  Public
router.post('/fuzzy', async (req, res) => {
  const { query, type } = req.body;

  //Validation
  const { error, value } = checkError(FuzzySearchValidation, {
    query,
    type,
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    let listings = await Listing.find({
      state: APPROVED,
      type: { $in: type },
    });

    let fields = type.reduce(
      (p, c) => {
        return [...p, `${c}.location`, `${c}.landmark`];
      },
      ['name']
    );
    console.log(fields);

    const searcher = new FuzzySearch(listings, fields);
    const foundListings = searcher.search(query);
    if (foundListings.length >0){
      listings = foundListings;
    }
      return res.status(200).json({
        success: true,
        payload: listings.map((listing) =>
          listing.type === SELL_PROJECT ? decorateProject(listing) : listing
        ),
        message: 'Properties data fetched successfully.',
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

// @route   GET listings/particular
// @desc    To fetch particular type of listings
// @access  Public
router.post('/particular', async (req, res) => {
  let { page, size, type } = req.body;

  //Validation
  const { error, value } = checkError(ParticularListingValidation, {
    page,
    size,
    type,
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    if (!page) {
      page = 1;
    }

    if (!size) {
      size = 10;
    }

    let listings = await Listing.find({ type: { $in: type } })
      .skip((page - 1) * size)
      .limit(size);

    return res.status(200).json({
      success: true,
      payload: listings.map((listing) =>
        listing.type === SELL_PROJECT ? decorateProject(listing) : listing
      ),
      message: 'Properties data fetched successfully.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

// @route   GET listings/all
// @desc    ADMIN =>  Can  fetch all listings of a user
//          CUSTOMER => Can fetch his/her all listings.
// @access  CUSTOMER, ADMIN
router.get('/all', auth(CUSTOMER, ADMIN), async (req, res) => {
  const { user } = req;

  try {
    let listings = [];

    if (user.role == ADMIN) {
      listings = await Listing.find().populate('createdBy', 'name');
    } else {
      listings = await Listing.find({ createdBy: user._id }).populate(
        'createdBy',
        'name'
      );
    }

    return res.status(200).json({
      success: true,
      payload: listings.map((listing) =>
        listing.type === SELL_PROJECT ? decorateProject(listing) : listing
      ),
      message: 'Properties data fetched successfully.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

// @route   GET listings/:listingId
// @desc    To fetch particular listing with listingId.
// @access  Private
router.get(
  '/:listingId',
  async (req, res, next) => {
    const {
      params: { listingId },
    } = req;

    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        toasts: ['Sorry, nothing found :('],
      });
    }

    try {
      let listing = await Listing.findOne({ _id: listingId });

      if (!listing) {
        return res.status(404).json({
          success: false,
          toasts: ['Sorry, nothing found :('],
        });
      }

      if (listing.state === APPROVED) {
        return res.json({
          success: true,
          payload:
            listing.type === SELL_PROJECT ? decorateProject(listing) : listing,
          message: 'Listing details found successfully.',
        });
      }

      res.locals.listing = listing;
      next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  },
  auth(ADMIN, CUSTOMER),
  (req, res, next) => {
    let { user } = req;
    let { listing } = res.locals;

    if (user.role === ADMIN) {
      return res.json({
        success: true,
        payload:
          listing.type === SELL_PROJECT ? decorateProject(listing) : listing,
        message: 'Listing details found successfully.',
      });
    }

    if (
      user.role === CUSTOMER &&
      listing.createdBy.toString() == user._id.toString()
    ) {
      return res.json({
        success: true,
        payload:
          listing.type === SELL_PROJECT ? decorateProject(listing) : listing,
        message: 'Listing details found successfully.',
      });
    }

    return res.status(403).json({
      success: false,
      toasts: ['Sorry, nothing found :('],
    });
  }
);

// @route   GET listings/related/:listingId
// @desc    To fetch related properties.
// @access  PUBLIC
router.get('/related/:listingId', async (req, res) => {
  const size = 4;

  if (!mongoose.isValidObjectId(req.params.listingId)) {
    return res.status(400).json({
      success: false,
      errors: { listingId: 'Invalid listingId provided.' },
    });
  }

  try {
    let listings = await Listing.find({
      state: APPROVED,
    })
      .sort('-createdAt')
      .limit(size);

    return res.json({
      success: true,
      payload: listings
        .map((listing) =>
          listing.type === SELL_PROJECT ? decorateProject(listing) : listing
        )
        .filter((listing) => listing._id.toString() !== req.params.listingId),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

// @route   POST listings/:listingId
// @desc    ADMIN =>  Can provide listingId to fetch all details of that property.
//          CUSTOMER => Can provide listingId & fetch all details of that property(Own).
// @access  CUSTOMER, ADMIN
// router.get('/:listingId', auth(CUSTOMER, ADMIN), async (req, res) => {
//   const {
//     user,
//     params: { listingId }
//   } = req;

//   if (!mongoose.isValidObjectId(listingId)) {
//     return res.status(400).json({
//       success: false,
//       errors: { listingId: 'Invalid listingId provided.' }
//     });
//   }

//   try {
//     let listing = await Listing.findById(listingId);

//     if (!listing) {
//       return res.status(404).json({
//         success: false,
//         toasts: ['Listing with the given listingId was not found.']
//       });
//     }

//     if (
//       user.role == ADMIN ||
//       (user.role == CUSTOMER &&
//         listing.createdBy.toString() == user._id.toString())
//     ) {
//       return res.status(200).json({
//         success: true,
//         payload:
//           listing.type === SELL_PROJECT ? decorateProject(listing) : listing,
//         message: 'Listing details found successfully.'
//       });
//     } else {
//       return res.status(403).json({
//         success: false,
//         toasts: ['You are not authorized to perform this action.']
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       toasts: ['Server error occurred']
//     });
//   }
// });

// @route   POST listings/user
// @desc    ADMIN =>  Can provide userId to fetch all listings of a user. body => { listingId }
// @access  ADMIN
router.post('/user', auth(ADMIN), async (req, res) => {
  const { userId } = req.body;

  try {
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        errors: { userId: 'Invalid userId provided.' },
      });
    }

    let listings = await Listing.find({ createdBy: userId });

    return res.status(200).json({
      success: true,
      payload: listings.map((listing) =>
        listing.type === SELL_PROJECT ? decorateProject(listing) : listing
      ),
      message: 'Properties data fetched successfully.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

/*
 @route   POST listings/add/rentlease
 @desc    Add new rentlease property
 @access  CUSTOMER, ADMIN
*/
router.post(
  '/add/rentlease',
  [auth(ADMIN, CUSTOMER), checkVerified],
  async (req, res) => {
    const { body, user } = req;
    const {
      name,
      location,
      landmark,
      apartmentType,
      rent,
      electricityIncluded,
      priceNegotiable,
      deposit,
      numBathrooms,
      numBalconies,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      otherRooms,
      furnishing,
      coveredParking,
      openParking,
      totalFloors,
      propertyOnFloor,
      ageOfProperty,
      availableFrom,
      willingToRentOutTo,
      pictures,
      featuredPicture,
      videoLink,
      societyName,
    } = body;

    //Validation
    const { error, value } = checkError(RentLeaseValidation, {
      name: name,
      societyName: societyName,
      location: location,
      landmark: landmark,
      apartmentType: apartmentType,
      rent: rent,
      electricityIncluded: electricityIncluded,
      priceNegotiable: priceNegotiable,
      deposit: deposit,
      numBathrooms: numBathrooms,
      numBalconies: numBalconies,
      carpetArea: carpetArea,
      builtUpArea: builtUpArea,
      superBuiltUpArea: superBuiltUpArea,
      otherRooms: otherRooms,
      furnishing: furnishing,
      coveredParking: coveredParking,
      openParking: openParking,
      totalFloors: totalFloors,
      propertyOnFloor: propertyOnFloor,
      ageOfProperty: ageOfProperty,
      availableFrom: availableFrom,
      willingToRentOutTo: willingToRentOutTo,
      pictures: pictures,
      featuredPicture: featuredPicture,
      videoLink: videoLink,
    });

    if (error) {
      return res.status(400).json({ success: false, errors: error });
    }

    try {
      const foundPictures = await findAndAttach(pictures);

      if (!foundPictures) {
        return res.status(500).json({
          success: false,
          toasts: ['Server was unable to process pictures'],
        });
      }

      const listing = new Listing({
        state: SUBMITTED, // TODO: Change this to Submitted once Dashboard is ready
        createdBy: user._id,
        type: RENT_LEASE,
        name: name,
        rentlease: {
          societyName: societyName,
          location: location,
          landmark: landmark,
          apartmentType: apartmentType,
          rent: rent,
          electricityIncluded: electricityIncluded,
          priceNegotiable: priceNegotiable,
          deposit: deposit,
          numBathrooms: numBathrooms,
          numBalconies: numBalconies,
          carpetArea: carpetArea,
          builtUpArea: builtUpArea,
          superBuiltUpArea: superBuiltUpArea,
          otherRooms: otherRooms,
          furnishing: furnishing,
          coveredParking: coveredParking,
          openParking: openParking,
          totalFloors: totalFloors,
          propertyOnFloor: propertyOnFloor,
          ageOfProperty: ageOfProperty,
          availableFrom: availableFrom,
          willingToRentOutTo: willingToRentOutTo,
          pictures: pictures,
          featuredPicture: featuredPicture,
          videoLink: videoLink,
        },
      });

      await listing.save();

      await onListingSubmittedEmail(user._id);

      return res.status(201).json({
        success: true,
        payload: listing,
        message: 'Rent/Lease Property added successfully.',
      });
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) {
        console.log(err.message.split(':')[2]);
      }
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  }
);

/*
 @route   PUT listings/update/rentlease
 @desc    Update existing rentlease property
 @access  CUSTOMER, ADMIN
*/
router.put(
  '/update/rentlease',
  [auth(ADMIN, CUSTOMER), checkVerified],
  async (req, res) => {
    const { body, user } = req;
    const {
      _id,
      name,
      location,
      landmark,
      apartmentType,
      rent,
      electricityIncluded,
      priceNegotiable,
      deposit,
      numBathrooms,
      numBalconies,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      otherRooms,
      furnishing,
      coveredParking,
      openParking,
      totalFloors,
      propertyOnFloor,
      ageOfProperty,
      availableFrom,
      willingToRentOutTo,
      pictures,
      featuredPicture,
      videoLink,
      societyName,
    } = body;

    if (!mongoose.isValidObjectId(_id)) {
      return res.status(400).json({
        success: false,
        toasts: ['Invalid Listing id'],
      });
    }

    //Validation
    const { error, value } = checkError(RentLeaseValidation, {
      name: name,
      societyName: societyName,
      location: location,
      landmark: landmark,
      apartmentType: apartmentType,
      rent: rent,
      electricityIncluded: electricityIncluded,
      priceNegotiable: priceNegotiable,
      deposit: deposit,
      numBathrooms: numBathrooms,
      numBalconies: numBalconies,
      carpetArea: carpetArea,
      builtUpArea: builtUpArea,
      superBuiltUpArea: superBuiltUpArea,
      otherRooms: otherRooms,
      furnishing: furnishing,
      coveredParking: coveredParking,
      openParking: openParking,
      totalFloors: totalFloors,
      propertyOnFloor: propertyOnFloor,
      ageOfProperty: ageOfProperty,
      availableFrom: availableFrom,
      willingToRentOutTo: willingToRentOutTo,
      pictures: pictures,
      featuredPicture: featuredPicture,
      videoLink: videoLink,
    });

    if (error) {
      return res.status(400).json({ success: false, errors: error });
    }

    try {
       const listing = await Listing.findOne({ _id });

       if (!listing) {
         return res.status(404).json({
           success: false,
           toasts: ['Listing with the given listingId was not found.'],
         });
       }

       const newPictures = _.difference(
         [...pictures],
         [...listing.rentlease.pictures]
       );

       const oldPictures = _.difference(
         [...listing.rentlease.pictures],
         [...pictures]
       );

       if (newPictures.length > 0) {
         const foundPictures = await findAndAttach(newPictures);

         if (!foundPictures) {
           return res.status(500).json({
             success: false,
             toasts: ['Server was unable to process pictures'],
           });
         }
       }

       if (oldPictures.length > 0) {
         const foundPictures = await findAndDelete(oldPictures);

         if (!foundPictures) {
           return res.status(500).json({
             success: false,
             toasts: ['Server was unable to process pictures'],
           });
         }
       }

      if (
        req.user.role === CUSTOMER &&
        req.user._id !== listing.createdBy.toString()
      ) {
        return res.status(403).json({
          success: false,
          toasts: ['Not authorized for this action'],
        });
      }

      await Listing.updateOne(
        { _id },
        {
          $set: {
            name: name,
            rentlease: {
              societyName: societyName,
              location: location,
              landmark: landmark,
              apartmentType: apartmentType,
              rent: rent,
              electricityIncluded: electricityIncluded,
              priceNegotiable: priceNegotiable,
              deposit: deposit,
              numBathrooms: numBathrooms,
              numBalconies: numBalconies,
              carpetArea: carpetArea,
              builtUpArea: builtUpArea,
              superBuiltUpArea: superBuiltUpArea,
              otherRooms: otherRooms,
              furnishing: furnishing,
              coveredParking: coveredParking,
              openParking: openParking,
              totalFloors: totalFloors,
              propertyOnFloor: propertyOnFloor,
              ageOfProperty: ageOfProperty,
              availableFrom: availableFrom,
              willingToRentOutTo: willingToRentOutTo,
              pictures: pictures,
              featuredPicture: featuredPicture,
              videoLink: videoLink,
            },
          },
        }
      );

      return res.status(200).json({
        success: true,
        payload: listing,
        message: 'Successfully updated property.',
      });
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) {
        console.log(err.message.split(':')[2]);
      }
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  }
);

/*
 @route   POST listings/add/sellapartment
 @desc    Add new sellapartment property
 @access  CUSTOMER, ADMIN
*/
router.post(
  '/add/sellapartment',
  [auth(ADMIN, CUSTOMER), checkVerified],
  async (req, res) => {
    const { body, user } = req;
    const {
      name,
      societyName,
      location,
      landmark,
      apartmentType,
      price,
      pricePerSqFt,
      allInclusivePrice,
      taxAndGovtChargesExcluded,
      priceNegotiable,
      numBathrooms,
      numBalconies,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      otherRooms,
      furnishing,
      coveredParking,
      openParking,
      totalFloors,
      propertyOnFloor,
      ageOfProperty,
      availabilityStatus,
      possessionBy,
      ownershipType,
      usp,
      pictures,
      featuredPicture,
      videoLink,
    } = body;

    //Validation
    const { error, value } = checkError(SellApartmentValidation, {
      name: name,
      societyName: societyName,
      location: location,
      landmark: landmark,
      apartmentType: apartmentType,
      price: price,
      pricePerSqFt: pricePerSqFt,
      allInclusivePrice: allInclusivePrice,
      taxAndGovtChargesExcluded: taxAndGovtChargesExcluded,
      priceNegotiable: priceNegotiable,
      numBathrooms: numBathrooms,
      numBalconies: numBalconies,
      carpetArea: carpetArea,
      builtUpArea: builtUpArea,
      superBuiltUpArea: superBuiltUpArea,
      otherRooms: otherRooms,
      furnishing: furnishing,
      coveredParking: coveredParking,
      openParking: openParking,
      totalFloors: totalFloors,
      propertyOnFloor: propertyOnFloor,
      ageOfProperty: ageOfProperty,
      availabilityStatus: availabilityStatus,
      possessionBy: possessionBy,
      ownershipType: ownershipType,
      usp: usp,
      pictures: pictures,
      featuredPicture: featuredPicture,
      videoLink: videoLink,
    });

    if (error) {
      return res.status(400).json({ success: false, errors: error });
    }

    try {
      const foundPictures = await findAndAttach(pictures);

      if (!foundPictures) {
        return res.status(500).json({
          success: false,
          toasts: ['Server was unable to process pictures'],
        });
      }

      const listing = new Listing({
        state: SUBMITTED, // TODO: Change this to Submitted once Dashboard is ready
        createdBy: user._id,
        type: SELL_APARTMENT,
        name: name,
        sellapartment: {
          societyName: societyName,
          location: location,
          landmark: landmark,
          apartmentType: apartmentType,
          price: price,
          pricePerSqFt: pricePerSqFt,
          allInclusivePrice: allInclusivePrice,
          taxAndGovtChargesExcluded: taxAndGovtChargesExcluded,
          priceNegotiable: priceNegotiable,
          numBathrooms: numBathrooms,
          numBalconies: numBalconies,
          carpetArea: carpetArea,
          builtUpArea: builtUpArea,
          superBuiltUpArea: superBuiltUpArea,
          otherRooms: otherRooms,
          furnishing: furnishing,
          coveredParking: coveredParking,
          openParking: openParking,
          totalFloors: totalFloors,
          propertyOnFloor: propertyOnFloor,
          ageOfProperty: ageOfProperty,
          availabilityStatus: availabilityStatus,
          possessionBy: possessionBy,
          ownershipType: ownershipType,
          usp: usp,
          pictures: pictures,
          featuredPicture: featuredPicture,
          videoLink: videoLink,
        },
      });

      await listing.save();

      await onListingSubmittedEmail(user._id);

      return res.status(201).json({
        success: true,
        payload: listing,
        message: 'Sell Apartment Property added successfully.',
      });
    } catch (err) {
      console.log(err);
      if (err instanceof mongoose.Error.ValidationError) {
        console.log(err.message.split(':')[2]);
      }
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  }
);

/*
 @route   PUT listings/update/sellapartment
 @desc    Update existing sellapartment property
 @access  CUSTOMER, ADMIN
*/
router.put(
  '/update/sellapartment',
  [auth(ADMIN, CUSTOMER), checkVerified],
  async (req, res) => {
    const { body, user } = req;
    const {
      _id,
      name,
      societyName,
      location,
      landmark,
      apartmentType,
      price,
      pricePerSqFt,
      allInclusivePrice,
      taxAndGovtChargesExcluded,
      priceNegotiable,
      numBathrooms,
      numBalconies,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      otherRooms,
      furnishing,
      coveredParking,
      openParking,
      totalFloors,
      propertyOnFloor,
      ageOfProperty,
      availabilityStatus,
      possessionBy,
      ownershipType,
      usp,
      pictures,
      featuredPicture,
      videoLink,
    } = body;

    if (!mongoose.isValidObjectId(_id)) {
      return res.status(400).json({
        success: false,
        toasts: ['Invalid Listing id'],
      });
    }

    //Validation
    const { error, value } = checkError(SellApartmentValidation, {
      name: name,
      societyName: societyName,
      location: location,
      landmark: landmark,
      apartmentType: apartmentType,
      price: price,
      pricePerSqFt: pricePerSqFt,
      allInclusivePrice: allInclusivePrice,
      taxAndGovtChargesExcluded: taxAndGovtChargesExcluded,
      priceNegotiable: priceNegotiable,
      numBathrooms: numBathrooms,
      numBalconies: numBalconies,
      carpetArea: carpetArea,
      builtUpArea: builtUpArea,
      superBuiltUpArea: superBuiltUpArea,
      otherRooms: otherRooms,
      furnishing: furnishing,
      coveredParking: coveredParking,
      openParking: openParking,
      totalFloors: totalFloors,
      propertyOnFloor: propertyOnFloor,
      ageOfProperty: ageOfProperty,
      availabilityStatus: availabilityStatus,
      possessionBy: possessionBy,
      ownershipType: ownershipType,
      usp: usp,
      pictures: pictures,
      featuredPicture: featuredPicture,
      videoLink: videoLink,
    });

    if (error) {
      return res.status(400).json({ success: false, errors: error });
    }

    try {
       const listing = await Listing.findOne({ _id });

       if (!listing) {
         return res.status(404).json({
           success: false,
           toasts: ['Listing with the given listingId was not found.'],
         });
       }

       const newPictures = _.difference(
         [...pictures],
         [...listing.sellapartment.pictures]
       );

       const oldPictures = _.difference(
         [...listing.sellapartment.pictures],
         [...pictures]
       );

       if (newPictures.length > 0) {
         const foundPictures = await findAndAttach(newPictures);

         if (!foundPictures) {
           return res.status(500).json({
             success: false,
             toasts: ['Server was unable to process pictures'],
           });
         }
       }

       if (oldPictures.length > 0) {
         const foundPictures = await findAndDelete(oldPictures);

         if (!foundPictures) {
           return res.status(500).json({
             success: false,
             toasts: ['Server was unable to process pictures'],
           });
         }
       }

      if (
        req.user.role === CUSTOMER &&
        req.user._id !== listing.createdBy.toString()
      ) {
        return res.status(403).json({
          success: false,
          toasts: ['Not authorized for this action'],
        });
      }

      await Listing.updateOne(
        { _id },
        {
          $set: {
            name: name,
            sellapartment: {
              societyName: societyName,
              location: location,
              landmark: landmark,
              apartmentType: apartmentType,
              price: price,
              pricePerSqFt: pricePerSqFt,
              allInclusivePrice: allInclusivePrice,
              taxAndGovtChargesExcluded: taxAndGovtChargesExcluded,
              priceNegotiable: priceNegotiable,
              numBathrooms: numBathrooms,
              numBalconies: numBalconies,
              carpetArea: carpetArea,
              builtUpArea: builtUpArea,
              superBuiltUpArea: superBuiltUpArea,
              otherRooms: otherRooms,
              furnishing: furnishing,
              coveredParking: coveredParking,
              openParking: openParking,
              totalFloors: totalFloors,
              propertyOnFloor: propertyOnFloor,
              ageOfProperty: ageOfProperty,
              availabilityStatus: availabilityStatus,
              possessionBy: possessionBy,
              ownershipType: ownershipType,
              usp: usp,
              pictures: pictures,
              featuredPicture: featuredPicture,
              videoLink: videoLink,
            },
          },
        }
      );

      return res.status(200).json({
        success: true,
        payload: listing,
        message: 'Successfully updated property.',
      });
    } catch (err) {
      console.log(err);
      if (err instanceof mongoose.Error.ValidationError) {
        console.log(err.message.split(':')[2]);
      }
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  }
);

/*
 @route   POST listings/add/sellproject
 @desc    Add new sellproject property
 @access  CUSTOMER, ADMIN
*/
router.post(
  '/add/sellproject',
  [auth(ADMIN, CUSTOMER), checkVerified],
  async (req, res) => {
    const { body, user } = req;
    const {
      name,
      location,
      landmark,
      apartmentTypes,
      units,
      coveredParking,
      openParking,
      totalFloors,
      ageOfProperty,
      availabilityStatus,
      ownershipType,
      usp,
      pictures,
      featuredPicture,
      brochureLink,
      videoLink,
      possessionBy,
    } = body;

    const checkDiff = _.difference(Object.keys(units), apartmentTypes);
    if (checkDiff.length > 0) {
      checkDiff.forEach((d) => {
        delete units[d];
      });
    }

    let unitsArray = objToArray(units, 'apartmentType');

    //Validation
    const { error, value } = checkError(SellProjectValidation, {
      name: name,
      location: location,
      landmark: landmark,
      apartmentTypes: apartmentTypes,
      units: unitsArray,
      coveredParking: coveredParking,
      openParking: openParking,
      totalFloors: totalFloors,
      ageOfProperty: ageOfProperty,
      availabilityStatus: availabilityStatus,
      ownershipType: ownershipType,
      usp: usp,
      pictures: pictures,
      featuredPicture: featuredPicture,
      brochureLink: brochureLink,
      videoLink: videoLink,
      possessionBy: possessionBy,
    });

    if (error) {
      return res.status(400).json({ success: false, errors: error });
    }

    try {
      const foundPictures = await findAndAttach(pictures);

      if (!foundPictures) {
        return res.status(500).json({
          success: false,
          toasts: ['Server was unable to process pictures'],
        });
      }

      const listing = new Listing({
        state: SUBMITTED, // TODO: Change this to Submitted once Dashboard is ready
        createdBy: user._id,
        type: SELL_PROJECT,
        name: name,
        sellproject: {
          location: location,
          landmark: landmark,
          apartmentTypes: apartmentTypes,
          units: unitsArray,
          coveredParking: coveredParking,
          openParking: openParking,
          totalFloors: totalFloors,
          ageOfProperty: ageOfProperty,
          availabilityStatus: availabilityStatus,
          possessionBy: possessionBy,
          ownershipType: ownershipType,
          usp: usp,
          pictures: pictures,
          featuredPicture: featuredPicture,
          brochureLink: brochureLink,
          videoLink: videoLink,
        },
      });

      await listing.save();

      await onListingSubmittedEmail(user._id);

      return res.status(201).json({
        success: true,
        payload: decorateProject(listing),
        message: 'Sell Project Property added successfully.',
      });
    } catch (err) {
      console.log(err);
      if (err instanceof mongoose.Error.ValidationError) {
        console.log(err.message.split(':')[2]);
      }
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  }
);

/*
 @route   PUT listings/add/sellproject
 @desc    Update existing sellproject property
 @access  CUSTOMER, ADMIN
*/
router.put(
  '/update/sellproject',
  [auth(ADMIN, CUSTOMER), checkVerified],
  async (req, res) => {
    const { body, user } = req;
    const {
      _id,
      name,
      location,
      landmark,
      apartmentTypes,
      units,
      coveredParking,
      openParking,
      totalFloors,
      ageOfProperty,
      availabilityStatus,
      ownershipType,
      usp,
      pictures,
      featuredPicture,
      brochureLink,
      videoLink,
      possessionBy,
    } = body;

    const checkDiff = _.difference(Object.keys(units), apartmentTypes);
    if (checkDiff.length > 0) {
      checkDiff.forEach((d) => {
        delete units[d];
      });
    }

    let unitsArray = objToArray(units, 'apartmentType');

    if (!mongoose.isValidObjectId(_id)) {
      return res.status(400).json({
        success: false,
        toasts: ['Invalid Listing id'],
      });
    }

    //Validation
    const { error, value } = checkError(SellProjectValidation, {
      name: name,
      location: location,
      landmark: landmark,
      apartmentTypes: apartmentTypes,
      units: unitsArray,
      coveredParking: coveredParking,
      openParking: openParking,
      totalFloors: totalFloors,
      ageOfProperty: ageOfProperty,
      availabilityStatus: availabilityStatus,
      ownershipType: ownershipType,
      usp: usp,
      pictures: pictures,
      featuredPicture: featuredPicture,
      brochureLink: brochureLink,
      videoLink: videoLink,
      possessionBy: possessionBy,
    });

    if (error) {
      return res.status(400).json({ success: false, errors: error });
    }

    try {
      const listing = await Listing.findOne({ _id });

      if (!listing) {
        return res.status(404).json({
          success: false,
          toasts: ['Listing with the given listingId was not found.'],
        });
      }

      const newPictures = _.difference(
        [...pictures],
        [...listing.sellproject.pictures]
      );

      const oldPictures = _.difference(
        [...listing.sellproject.pictures],
        [...pictures]
      );

      if (newPictures.length > 0) {
        const foundPictures = await findAndAttach(newPictures);

        if (!foundPictures) {
          return res.status(500).json({
            success: false,
            toasts: ['Server was unable to process pictures'],
          });
        }
      }

      if (oldPictures.length > 0) {
        const foundPictures = await findAndDelete(oldPictures);

        if (!foundPictures) {
          return res.status(500).json({
            success: false,
            toasts: ['Server was unable to process pictures'],
          });
        }
      }

      if (
        req.user.role === CUSTOMER &&
        req.user._id !== listing.createdBy.toString()
      ) {
        return res.status(403).json({
          success: false,
          toasts: ['Not authorized for this action'],
        });
      }

      await Listing.updateOne(
        { _id },
        {
          $set: {
            name: name,
            sellproject: {
              location: location,
              landmark: landmark,
              apartmentTypes: apartmentTypes,
              units: unitsArray,
              coveredParking: coveredParking,
              openParking: openParking,
              totalFloors: totalFloors,
              ageOfProperty: ageOfProperty,
              availabilityStatus: availabilityStatus,
              possessionBy: possessionBy,
              ownershipType: ownershipType,
              usp: usp,
              pictures: pictures,
              featuredPicture: featuredPicture,
              brochureLink: brochureLink,
              videoLink: videoLink,
            },
          },
        }
      );

      return res.status(200).json({
        success: true,
        payload: listing,
        message: 'Successfully updated property.',
      });
    } catch (err) {
      console.log(err);
      if (err instanceof mongoose.Error.ValidationError) {
        console.log(err.message.split(':')[2]);
      }
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred'],
      });
    }
  }
);

// @route   DELETE listings/delete
// @desc    To delete a existing property
//          body : { listingId }
// @access  CUSTOMER, ADMIN
router.delete('/delete', auth(ADMIN, CUSTOMER), async (req, res) => {
  const {
    body: { listingId },
    user,
  } = req;
  if (!mongoose.isValidObjectId(listingId)) {
    return res.status(400).json({
      success: false,
      errors: { listingId: 'Invalid listingId provided.' },
    });
  }

  try {
    let listing = await Listing.findByIdAndDelete(listingId);
    console.log(listing);
    if (!listing) {
      return res.status(404).json({
        success: false,
        toasts: ['Listing with the given listingId was not found.'],
      });
    }

    if (
      user.role == ADMIN ||
      (user.role == CUSTOMER &&
        listing.createdBy.toString() == user._id.toString())
    ) {
      await Listing.findByIdAndDelete(listingId);

      return res.status(200).json({
        success: true,
        message: 'Listing has been deleted successfully.',
      });
    } else {
      return res.status(403).json({
        success: false,
        toasts: ['You are not authorized to perform this action.'],
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

// @route   PUT listings/updateState
// @desc    To update the state of a listing.
//          body => { listingId, state}
// @access  ADMIN
router.put('/updateState', auth(ADMIN), async (req, res) => {
  const { listingId, state } = req.body;

  let errors = {};

  if (!mongoose.isValidObjectId(listingId)) {
    errors = { listingId: 'Invalid listingId provided.' };
  }
  if (![SUBMITTED, APPROVED, REJECTED, DEACTIVATED].includes(state)) {
    errors = { ...errors, state: 'Invalid state provided.' };
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors,
    });
  }

  try {
    let listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        toasts: ['Listing with the given listingId was not found.'],
      });
    }

    listing = await Listing.findByIdAndUpdate(
      listingId,
      { state: state },
      { new: true }
    );

    if (state == APPROVED) {
      const user = await User.findById(listing.createdBy);
      let customerName = user.name.first + ' ' + user.name.last;
      await sendMail({
        to: user.email,
        from: config.get('env.smtp.user'),
        subject: 'Your listing is live!',
        template: 'approvedListing',
        templateVars: {
          name: customerName,
        },
      });
    }

    return res.status(200).json({
      success: true,
      payload:
        listing.type === SELL_PROJECT ? decorateProject(listing) : listing,
      message: `Listing ${state} Successfully.`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred'],
    });
  }
});

module.exports = router;
