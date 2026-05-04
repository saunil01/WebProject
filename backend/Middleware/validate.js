// validate(schema, source) returns an Express middleware that runs the given
// zod schema against req[source] (default: req.body). On success it REPLACES
// req[source] with the parsed/cleaned data so controllers always see the
// trimmed, coerced, schema-only version. On failure it returns 400 with a
// structured error response.
//
// Usage:
//   const { validate } = require("../Middleware/validate");
//   const schemas = require("../validation/schemas");
//   router.post("/", validate(schemas.moodCreate), controller.createMood);

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join(".") || source,
        message: i.message,
      }));
      // Use the first issue's message as the human-readable summary so the
      // frontend can show it in a single toast.
      return res.status(400).json({
        message: issues[0]?.message || "Invalid request",
        errors: issues,
      });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
