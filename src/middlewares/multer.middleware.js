import multer from "multer";

const storage = {
  storage: multer.diskStorage({}),
  // limits: {fileSize: 5000000}
};

export const upload = multer( storage );
