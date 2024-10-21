
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        console.log("Mai async se aya hu ",error)
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
};

export { asyncHandler };
