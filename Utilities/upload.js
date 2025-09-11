const multer = require("multer");
const {CloudinaryStorage} =  require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary.config");

const storage = new CloudinaryStorage({
    cloudinary:cloudinary,
    params:{
        folder:"images",
        allowed_formats:['jpg', 'png', 'jpeg', 'webp', 'mp4'],
         resource_type: 'auto',
    }
})
const upload = multer({
    storage : storage,
    limits:{
        fieldSize : 10 * 1024 * 1024
    }
})

module.exports = upload
