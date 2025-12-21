const axios = require("axios");
const FormData = require("form-data");
const {
  REGION_MAPPING,
  SECURITY_FEATURE_REQUIREMENTS,
  VALIDATION_RULES,
} = require("../utils");

class IDVerificationService {
  constructor() {
    this.apiInstances = {};
  }

  getRegionForCountry(countryCode) {
    for (const [region, countries] of Object.entries(REGION_MAPPING)) {
      if (countries.includes(countryCode)) {
        return region;
      }
    }
    return "US";
  }

  async validateDocument(result, documentType, countryCode) {
    const validationRules = this.getValidationRules(documentType, countryCode);
    const validationResults = {
      isValid: true,
      errors: [],
    };

    for (const field of validationRules.requiredFields) {
      if (!result[field]) {
        validationResults.errors.push(`Missing required field: ${field}`);
        validationResults.isValid = false;
      }
    }

    if (
      validationRules.documentNumberFormat &&
      !validationRules.documentNumberFormat.test(result.document_number)
    ) {
      validationResults.errors.push("Invalid document number format");
      validationResults.isValid = false;
    }

    if (validationRules.ageCheck) {
      const age = this.calculateAge(result.dob);
      if (age < validationRules.minAge || age > validationRules.maxAge) {
        validationResults.errors.push(
          `Age ${age} is outside valid range (${validationRules.minAge}-${validationRules.maxAge})`,
        );
        validationResults.isValid = false;
      }
    }

    if (validationRules.expiryRequired) {
      if (!result.expiry_date) {
        validationResults.errors.push("Missing expiry date");
        validationResults.isValid = false;
      } else {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(
          result.expiry_date,
        );
        if (daysUntilExpiry < validationRules.expiryMinDays) {
          validationResults.errors.push(
            `Document expires in ${daysUntilExpiry} days (minimum ${validationRules.expiryMinDays} days required)`,
          );
          validationResults.isValid = false;
        }
      }
    }

    if (validationRules.securityFeatures) {
      for (const feature of validationRules.securityFeatures) {
        const securityRequirements = SECURITY_FEATURE_REQUIREMENTS[feature];
        const featureResult = result.security_features?.[feature];

        if (
          !featureResult ||
          featureResult.confidence < securityRequirements.minConfidence
        ) {
          validationResults.errors.push(
            `Failed security feature check: ${feature}`,
          );
          validationResults.isValid = false;
        }
      }
    }

    return validationResults;
  }

  getValidationRules(documentType, countryCode) {
    if (VALIDATION_RULES[countryCode]?.[documentType]) {
      return VALIDATION_RULES[countryCode][documentType];
    }
    return VALIDATION_RULES[documentType] || VALIDATION_RULES["ID"];
  }

  calculateAge(dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  calculateDaysUntilExpiry(expiryDate) {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async verifyDocument(imageBuffer, countryCode, documentType = null) {
    try {
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("No image buffer provided or it is empty.");
      }

      const base64Image = imageBuffer.toString("base64");

      const imageFileBuffer = Buffer.from(base64Image, "base64");

      const region = this.getRegionForCountry(countryCode);
      const apiUrl =
        region === "US"
          ? "https://api.idanalyzer.com"
          : `https://api-${region}.idanalyzer.com`;

      const form = new FormData();
      form.append("apikey", process.env.IDANALYZER_API_KEY);
      form.append("file", imageFileBuffer, {
        filename: "document.jpg",
        contentType: "image/jpeg",
      });
      form.append("documentType", documentType || "");
      form.append("biometric", "true");
      form.append("verify_expiry", "true");
      form.append("verify_documentnumber", "true");
      form.append("verify_age", "true");
      form.append("validate_security_features", "true");

      const headers = {
        ...form.getHeaders(),
      };

      const response = await axios.post(apiUrl, form, { headers });

      const result = response.data;

      if (!result || result.error) {
        throw new Error(result.error?.message || "ID verification failed");
      }

      const validationResults = await this.validateDocument(
        result.result,
        result.result?.document_type || documentType,
        countryCode,
      );

      return {
        success: validationResults.isValid,
        data: {
          documentNumber: result.result?.document_number,
          documentType: result.result?.document_type,
          expiryDate: result.result?.expiry_date,
          issueDate: result.result?.issue_date,
          issuingCountry: result.result?.country,
          firstName: result.result?.firstname,
          lastName: result.result?.lastname,
          dateOfBirth: result.result?.dob,
          age: this.calculateAge(result.result?.dob),
          address: result.result?.address,
          nationality: result.result?.nationality,
        },
        verification: {
          isValid: validationResults.isValid,
          errors: validationResults.errors,
          authenticityScore: result.result?.authenticate || 0,
          securityFeatures: result.result?.security_features || {},
          faceDetection: result.result?.face || {},
        },
        rawResult: result,
      };
    } catch (error) {
      throw new Error(
        error.message || "An error occurred during ID verification.",
      );
    }
  }
}

module.exports = {
  IDVerificationService,
};
