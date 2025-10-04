const { v2: cloudinary } = require('cloudinary');
const { Op } = require("sequelize");
const { sequelize, User, Role, Favourite, DeliveryAddress } = require("../models");

// ===============================================================
// --- USER-FACING PROFILE ACTIONS ---
// ===============================================================

const getProfile = async (userId) => {
    const user = await User.findOne({
        where: { id: userId, status: 1 },
        // Default scope already excludes password etc., so no need for explicit attributes
        include: [{ model: Role, as: 'role', attributes: ['roleId', 'roleName'] }],
    });

    if (!user) {
        throw new Error("User not found.");
    }

    const favourites = await Favourite.findAll({
        where: { userId },
        attributes: ['productId'],
    });

    return { user, favourites: favourites.map(f => f.productId) };
};

const updateProfile = async (id, data, newAvatarFile) => {
    const userToUpdate = await User.findByPk(id);
    if (!userToUpdate) {
        throw new Error("User not found.");
    }

    if (newAvatarFile && userToUpdate.avatarId) {
        await cloudinary.uploader.destroy(userToUpdate.avatarId);
    }
    
    const updateData = { ...data };
    if (newAvatarFile) {
        updateData.avatar = newAvatarFile.path;
        updateData.avatarId = newAvatarFile.filename;
    }

    try {
        // Use the instance's update method for cleaner code
        await userToUpdate.update(updateData);
        return userToUpdate;
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0].path;
            throw new Error(`This ${field} is already in use.`);
        }
        throw error;
    }
};

// ===============================================================
// --- ADMIN-ONLY USER MANAGEMENT ---
// ===============================================================

const createUserByAdmin = async (data) => {
    const { email, userName, password, roleId, phoneNumber, address } = data;
    if (!email || !userName || !password || !roleId) {
        throw new Error("Missing required parameters!");
    }

    return sequelize.transaction(async (t) => {
        const whereClause = [];
        if (email) whereClause.push({ email });
        if (phoneNumber) whereClause.push({ phoneNumber });

        if (whereClause.length > 0) {
            const existingUser = await User.findOne({ where: { [Op.or]: whereClause }, transaction: t });
            if (existingUser) {
                const message = existingUser.email === email ? "Email is already in use." : "Phone number is already in use.";
                throw new Error(message);
            }
        }

        // NO NEED to call hashPassword. The model's beforeSave hook does it for us.
        const newUser = await User.create({
            email,
            userName,
            password, // Just pass the plain password
            roleId,
            phoneNumber,
            status: 1, // Admin-created users are active by default
        }, { transaction: t });

        if (address) {
            await DeliveryAddress.create({
                userId: newUser.id,
                // Assuming 'address' is the full street line for simplicity
                streetLine1: address,
                receiverName: userName,
                phone: phoneNumber,
                isDefault: true,
                // Add default city, country etc. or get from input
                city: 'Default City',
                postalCode: '00000',
                country: 'Default Country',
            }, { transaction: t });
        }
        return newUser;
    });
};

const getAllUsers = async (limit = 10, page = 1, sort = "id,desc", name) => {
    const offset = (page - 1) * limit;
    const where = {};
    if (name) {
        where.userName = { [Op.iLike]: `%${name}%` };
    }
    const [sortField, sortOrder] = sort.split(',');

    const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortField, sortOrder]],
        include: [{ model: Role, as: 'role' }] // Default scope already handles attributes
    });
    return { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page, users: rows };
};

const deleteUser = async (id) => {
    const user = await User.findByPk(id);
    if (!user) throw new Error("User not found.");
    
    if (user.avatarId) {
        await cloudinary.uploader.destroy(user.avatarId);
    }
    
    // The model's hooks (e.g., beforeDestroy) could handle cascading deletes
    return await User.destroy({ where: { id } });
};

const getAllRoles = async () => {
    return Role.findAll({
        attributes: ['id', 'roleId', 'roleName'],
        order: [['roleName', 'ASC']]
    });
};

module.exports = {
  getProfile,
  updateProfile,
  createUserByAdmin,
  getAllUsers,
  deleteUser,
  getAllRoles,
};
