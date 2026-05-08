const router = require('express').Router();

const PetController = require('../controllers/PetController');

const verifyToken = require('../helpers/verify-token');
const {imageUpload} = require('../helpers/image-upload');

router.post('/create', verifyToken, imageUpload.array('images', 5), PetController.create);
router.get('/getAll', PetController.getAll);
router.get('/getAllUserPets', verifyToken, PetController.getAllUserPets);
router.get('/getAllUserAdoptions', verifyToken, PetController.getAllUserAdoptions);

router.post('/schedule/:id', verifyToken, PetController.schedule);
router.post('/concludeAdoption/:id', verifyToken, PetController.concludeAdoption);

router.patch('/:id', verifyToken, imageUpload.array('images', 5), PetController.update);
router.delete('/:id', verifyToken, PetController.removePetById);
router.get('/:id', PetController.getPetById);

module.exports = router;