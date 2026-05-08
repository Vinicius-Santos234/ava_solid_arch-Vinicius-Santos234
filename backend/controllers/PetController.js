const Pet = require('../models/Pet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const ObjectId = require('mongoose').Types.ObjectId;

const getToken = require('../helpers/get-token');
const getUserByToken = require('../helpers/get-user-by-token');

module.exports = class PetController {
    static async create(req, res) {
        const { name, age, weight, color } = req.body;

        if (!name) {
            res.status(422).json({ message: 'O nome é obrigatório!' });
            return;
        }

        if (!age) {
            res.status(422).json({ message: 'A idade é obrigatória!' });
            return;
        }

        if (!weight) {
            res.status(422).json({ message: 'O peso é obrigatório!' });
            return;
        }

        if (!color) {
            res.status(422).json({ message: 'A cor é obrigatória!' });
            return;
        }

        if (!req.files || req.files.length === 0) {
            res.status(422).json({ message: 'As imagens são obrigatórias!' });
            return;
        }

        const images = req.files.map((file) => file.filename);

        const token = getToken(req);
        const user = await getUserByToken(token);

        const pet = new Pet({
            name,
            age,
            weight,
            color,
            image: images,
            available: true,
            user: {
                _id: user._id,
                name: user.name,
                image: user.image,
                phone: user.phone,
            },
        });

        try {
            const newPet = await pet.save();
            res.status(201).json({ message: 'Pet cadastrado com sucesso!', newPet });

        } catch (error) {
            res.status(500).json({ message: 'Aconteceu um erro no servidor, tente novamente mais tarde!' });
        }
    }
    static async getAll(req, res) {
        const pets = await Pet.find().sort('-createdAt');
        res.status(200).json({ pets: pets });
    }
    static async getAllUserPets(req, res) {
        const token = getToken(req);
        const user = await getUserByToken(token);
        const pets = await Pet.find({ 'user._id': user._id }).sort('-createdAt');
        res.status(200).json({ pets: pets });
    }
    static async getAllUserAdoptions(req, res) {
        const token = getToken(req);
        const user = await getUserByToken(token);
        const adoptions = await Adoption.find({ 'user._id': user._id }).sort('-createdAt');
        res.status(200).json({ adoptions: adoptions });
    }
    static async getPetById(req, res) {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' });
            return;
        }

        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' });
            return;
        }
        res.status(200).json({ pet: pet });
    }
    static async removePetById(req, res) {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' });
            return;
        }

        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' });
            return;
        }

        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(422).json({ message: 'Ocorreu um erro, tente novamente mais tarde!' });
            return;
        }
    }
    static async updatePet(req, res) {
        const id = req.params.id;
        const name = req.body.name;
        const age = req.body.age;
        const weight = req.body.weight;
        const color = req.body.color;
        const description = req.body.description;
        const images = req.files;
        const available = req.body.available;

        const updateData = {};

        if(!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' });
            return;
        }

        const pet = await Pet.findOne({ _id: id });

        if(!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' });
            return;
        }

        const token = getToken(req);
        const user = await getUserByToken(token);

        if(pet.user._id.toString() !== user._id.toString()) {
            res.status(422).json({ message: 'Ocorreu um erro, tente novamente mais tarde!' });
            return;
        }

        if(!name) {
            res.status(422).json({ message: 'O nome é obrigatório!' });
            return;
        } else {
            updateData.name = name;
        }

        if(!age) {
            res.status(422).json({ message: 'A idade é obrigatória!' });
            return;
        } else {
            updateData.age = age;
        }

        if(!weight) {
            res.status(422).json({ message: 'O peso é obrigatório!' });
            return;
        } else {
            updateData.weight = weight;
        }

        if(!color) {
            res.status(422).json({ message: 'A cor é obrigatória!' });
            return;
        } else {
            updateData.color = color;
        }

        if (images && images.length > 0) {
            updateData.image = [];
            images.map(image => {
                updateData.image.push(image.filename);
            });
        }

        updateData.description = description;

        await Pet.findByIdAndUpdate(id, updateData);

        res.status(200).json({ message: 'Pet atualizado com sucesso!' });
        
    }
    static async schedule(req, res) {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' });
            return;
        }

        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' });
            return;
        }

        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.equals(user._id)) {
            res.status(422).json({ message: 'Você não pode agendar uma visita para seu próprio pet!' });
            return;
        }

        if (pet.adopter && pet.adopter.id && pet.adopter.id.equals(user._id)) {
            res.status(422).json({ message: 'Você não pode agendar uma visita para um pet que já está adotado!' });
            return;
        }

        pet.adopter = {
            id: user._id,
            name: user.name,
            image: user.image,
            phone: user.phone,
        };

        await Pet.findByIdAndUpdate(id, pet);

        res.status(200).json({ message: `Visita agendada com sucesso, entre em contato com ${pet.user.name} pelo telefone ${pet.user.phone} para combinar a visita!` });
    }
    static async concludeAdoption(req, res) {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            res.status(422).json({ message: 'ID inválido!' });
            return;
        }

        const pet = await Pet.findOne({ _id: id });

        if (!pet) {
            res.status(404).json({ message: 'Pet não encontrado!' });
            return;
        }

        const token = getToken(req);
        const user = await getUserByToken(token);

        if (pet.user._id.toString() !== user._id.toString()) {
            res.status(422).json({ message: 'Ocorreu um erro, tente novamente mais tarde!' });
            return;
        }

        pet.available = false;

        await Pet.findByIdAndUpdate(id, pet);

        res.status(200).json({ message: 'Parabéns! O ciclo de adoção foi concluído com sucesso!' });
    }
};
       
