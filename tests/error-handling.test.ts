import { describe, it, expect } from 'vitest';
import { NotFoundError, ValidationError } from '../src/types.js';

describe('Error Handling', () => {
  describe('NotFoundError', () => {
    it('should create NotFoundError with entity and id', () => {
      // Act
      const error = new NotFoundError('Prompt', '123');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Prompt with id '123' not found");
      expect(error.name).toBe('NotFoundError');
    });

    it('should create NotFoundError with resource and id', () => {
      // Act
      const error = new NotFoundError('User', '456');

      // Assert
      expect(error.message).toBe("User with id '456' not found");
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with message', () => {
      // Act
      const error = new ValidationError('Invalid input data');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Invalid input data');
      expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with custom message', () => {
      // Act
      const error = new ValidationError('Custom validation error');

      // Assert
      expect(error.message).toBe('Custom validation error');
    });
  });

  describe('Error inheritance', () => {
    it('should allow NotFoundError to be caught as Error', () => {
      // Arrange
      const notFoundError = new NotFoundError('Test', '123');

      // Act & Assert
      expect(() => {
        throw notFoundError;
      }).toThrow(Error);
    });

    it('should allow ValidationError to be caught as Error', () => {
      // Arrange
      const validationError = new ValidationError('Test error');

      // Act & Assert
      expect(() => {
        throw validationError;
      }).toThrow(Error);
    });

    it('should allow specific error type checking', () => {
      // Arrange
      const notFoundError = new NotFoundError('Test', '123');
      const validationError = new ValidationError('Test error');

      // Act & Assert
      expect(notFoundError).toBeInstanceOf(NotFoundError);
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(notFoundError).not.toBeInstanceOf(ValidationError);
      expect(validationError).not.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Error message formatting', () => {
    it('should format NotFoundError message correctly', () => {
      // Act
      const error1 = new NotFoundError('Prompt', 'abc123');
      const error2 = new NotFoundError('User', 'def456');

      // Assert
      expect(error1.message).toBe("Prompt with id 'abc123' not found");
      expect(error2.message).toBe("User with id 'def456' not found");
    });

    it('should handle special characters in NotFoundError', () => {
      // Act
      const error = new NotFoundError('Test-Entity', 'test-id_123');

      // Assert
      expect(error.message).toBe("Test-Entity with id 'test-id_123' not found");
    });
  });
}); 