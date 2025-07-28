# 🧱 Test Scaffolds
**Based on:** `coverage-enhancement-plan-20250128-0615.md`  
**Generated:** 2025-01-28 06:25

## 🔧 Test: PromptService – Unit Tests

```typescript
describe("PromptService", () => {
  let service: PromptService;
  let mockRepository: Mock<PromptRepository>;

  beforeEach(() => {
    mockRepository = mock<PromptRepository>();
    service = new PromptService(mockRepository);
  });

  describe("createPrompt", () => {
    it("should create a prompt successfully", () => {
      // Arrange
      const createData = { name: "test", content: "content" };
      const expectedPrompt = { id: "123", ...createData };
      mockRepository.save.mockResolvedValue(expectedPrompt);

      // Act
      const result = await service.createPrompt(createData);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(createData);
      expect(result).toEqual(expectedPrompt);
    });

    it("should handle repository errors", () => {
      // Arrange
      mockRepository.save.mockRejectedValue(new Error("DB Error"));

      // Act & Assert
      expect(service.createPrompt({ name: "test", content: "content" }))
        .rejects.toThrow("DB Error");
    });
  });

  describe("getPrompt", () => {
    it("should return prompt when found", () => {
      // Arrange
      const expectedPrompt = { id: "123", name: "test" };
      mockRepository.getById.mockResolvedValue(expectedPrompt);

      // Act
      const result = await service.getPrompt("123");

      // Assert
      expect(result).toEqual(expectedPrompt);
    });

    it("should throw NotFoundError when prompt not found", () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null);

      // Act & Assert
      expect(service.getPrompt("nonexistent")).rejects.toThrow(NotFoundError);
    });
  });

  describe("applyTemplate", () => {
    it("should apply variables to template", () => {
      // Arrange
      const templatePrompt = { id: "123", content: "Hello {{name}}!", isTemplate: true };
      const variables = { name: "World" };
      mockRepository.getById.mockResolvedValue(templatePrompt);

      // Act
      const result = await service.applyTemplate({ id: "123", variables });

      // Assert
      expect(result).toBe("Hello World!");
    });

    it("should throw ValidationError for non-template prompts", () => {
      // Arrange
      const regularPrompt = { id: "123", content: "Hello", isTemplate: false };
      mockRepository.getById.mockResolvedValue(regularPrompt);

      // Act & Assert
      expect(service.applyTemplate({ id: "123", variables: {} }))
        .rejects.toThrow(ValidationError);
    });
  });

  describe("searchPrompts", () => {
    it("should search by name, content, description, and tags", () => {
      // Arrange
      const allPrompts = [
        { name: "test", content: "content", description: "desc", tags: ["tag1"] },
        { name: "other", content: "other", description: "other", tags: ["tag2"] }
      ];
      mockRepository.list.mockResolvedValue(allPrompts);

      // Act
      const results = await service.searchPrompts("test");

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("test");
    });
  });

  describe("getStats", () => {
    it("should calculate correct statistics", () => {
      // Arrange
      const prompts = [
        { isTemplate: true, category: "cat1", tags: ["tag1"] },
        { isTemplate: false, category: "cat1", tags: ["tag1", "tag2"] }
      ];
      mockRepository.list.mockResolvedValue(prompts);

      // Act
      const stats = await service.getStats();

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.templates).toBe(1);
      expect(stats.regular).toBe(1);
      expect(stats.categories.cat1).toBe(2);
      expect(stats.tags.tag1).toBe(2);
      expect(stats.tags.tag2).toBe(1);
    });
  });
});
```

## 🗄️ Test: PostgresPromptRepository – Integration Tests

```typescript
describe("PostgresPromptRepository", () => {
  let repository: PostgresPromptRepository;
  let testDb: postgres.Sql;

  beforeAll(async () => {
    // Setup test database connection
    repository = new PostgresPromptRepository({
      host: "localhost",
      port: 5433,
      database: "mcp_prompts_test",
      user: "mcp_user",
      password: "mcp_password_123"
    });
    await repository.connect();
  });

  afterAll(async () => {
    await repository.disconnect();
  });

  beforeEach(async () => {
    // Clean test database
    await testDb`DELETE FROM prompt_versions`;
    await testDb`DELETE FROM prompt_tags`;
    await testDb`DELETE FROM prompt_variables`;
    await testDb`DELETE FROM prompts`;
  });

  describe("save", () => {
    it("should create prompt with all fields", async () => {
      // Arrange
      const createData = {
        name: "Test Prompt",
        content: "Test content",
        description: "Test description",
        isTemplate: true,
        tags: ["tag1", "tag2"],
        category: "test-category"
      };

      // Act
      const result = await repository.save(createData);

      // Assert
      expect(result.name).toBe(createData.name);
      expect(result.content).toBe(createData.content);
      expect(result.tags).toEqual(createData.tags);
      expect(result.category).toBe(createData.category);
      expect(result.isTemplate).toBe(true);
    });

    it("should handle database connection errors", async () => {
      // Arrange
      const badRepository = new PostgresPromptRepository({
        host: "invalid-host",
        port: 5432,
        database: "nonexistent"
      });

      // Act & Assert
      await expect(badRepository.connect()).rejects.toThrow();
    });
  });

  describe("getById", () => {
    it("should return prompt with tags and variables", async () => {
      // Arrange
      const prompt = await repository.save({
        name: "Test",
        content: "Content",
        tags: ["tag1"],
        variables: ["var1"]
      });

      // Act
      const result = await repository.getById(prompt.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.tags).toEqual(["tag1"]);
      expect(result?.variables).toEqual(["var1"]);
    });

    it("should return null for non-existent prompt", async () => {
      // Act
      const result = await repository.getById("nonexistent");

      // Assert
      expect(result).toBeNull();
    });

    it("should return specific version when requested", async () => {
      // Arrange
      const prompt = await repository.save({ name: "Test", content: "v1" });
      await repository.update(prompt.id, { content: "v2" });

      // Act
      const v1 = await repository.getById(prompt.id, 1);
      const v2 = await repository.getById(prompt.id, 2);

      // Assert
      expect(v1?.content).toBe("v1");
      expect(v2?.content).toBe("v2");
    });
  });

  describe("list", () => {
    it("should filter by category", async () => {
      // Arrange
      await repository.save({ name: "Test1", content: "content", category: "cat1" });
      await repository.save({ name: "Test2", content: "content", category: "cat2" });

      // Act
      const results = await repository.list({ category: "cat1" });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("cat1");
    });

    it("should filter by tags", async () => {
      // Arrange
      await repository.save({ name: "Test1", content: "content", tags: ["tag1"] });
      await repository.save({ name: "Test2", content: "content", tags: ["tag2"] });

      // Act
      const results = await repository.list({ tags: ["tag1"] });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain("tag1");
    });
  });

  describe("update", () => {
    it("should create new version on update", async () => {
      // Arrange
      const prompt = await repository.save({ name: "Test", content: "v1" });

      // Act
      const updated = await repository.update(prompt.id, { content: "v2" });

      // Assert
      expect(updated.version).toBe(2);
      expect(updated.content).toBe("v2");
    });
  });

  describe("delete", () => {
    it("should delete prompt and return true", async () => {
      // Arrange
      const prompt = await repository.save({ name: "Test", content: "content" });

      // Act
      const result = await repository.delete(prompt.id);

      // Assert
      expect(result).toBe(true);
      const retrieved = await repository.getById(prompt.id);
      expect(retrieved).toBeNull();
    });

    it("should return false for non-existent prompt", async () => {
      // Act
      const result = await repository.delete("nonexistent");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("healthCheck", () => {
    it("should return true when database is connected", async () => {
      // Act
      const result = await repository.healthCheck();

      // Assert
      expect(result).toBe(true);
    });
  });
});
```

## 🔌 Test: McpPromptServer – Integration Tests

```typescript
describe("McpPromptServer", () => {
  let server: McpPromptServer;
  let mockService: Mock<PromptService>;

  beforeEach(() => {
    mockService = mock<PromptService>();
    server = new McpPromptServer(mockService);
  });

  describe("add_prompt tool", () => {
    it("should create prompt successfully", async () => {
      // Arrange
      const args = { name: "Test", content: "Content" };
      const expectedPrompt = { id: "123", ...args };
      mockService.createPrompt.mockResolvedValue(expectedPrompt);

      // Act
      const result = await server.getServer().callTool("add_prompt", args);

      // Assert
      expect(result.content[0].text).toContain("Created prompt");
      expect(mockService.createPrompt).toHaveBeenCalledWith(args);
    });

    it("should handle service errors", async () => {
      // Arrange
      mockService.createPrompt.mockRejectedValue(new Error("Service error"));

      // Act
      const result = await server.getServer().callTool("add_prompt", { name: "Test", content: "Content" });

      // Assert
      expect(result.content[0].text).toContain("Error creating prompt");
    });
  });

  describe("get_prompt tool", () => {
    it("should retrieve prompt by ID", async () => {
      // Arrange
      const expectedPrompt = { id: "123", name: "Test", content: "Content" };
      mockService.getPrompt.mockResolvedValue(expectedPrompt);

      // Act
      const result = await server.getServer().callTool("get_prompt", { id: "123" });

      // Assert
      expect(result.content[0].text).toContain("Test");
      expect(mockService.getPrompt).toHaveBeenCalledWith("123", undefined);
    });

    it("should handle specific version", async () => {
      // Arrange
      mockService.getPrompt.mockResolvedValue({ id: "123", version: 2 });

      // Act
      await server.getServer().callTool("get_prompt", { id: "123", version: 2 });

      // Assert
      expect(mockService.getPrompt).toHaveBeenCalledWith("123", 2);
    });
  });

  describe("list_prompts tool", () => {
    it("should list prompts with filters", async () => {
      // Arrange
      const prompts = [{ id: "123", name: "Test" }];
      mockService.listPrompts.mockResolvedValue(prompts);

      // Act
      const result = await server.getServer().callTool("list_prompts", { category: "test" });

      // Assert
      expect(result.content[0].text).toContain("Test");
      expect(mockService.listPrompts).toHaveBeenCalledWith({ category: "test" });
    });
  });

  describe("apply_template tool", () => {
    it("should apply variables to template", async () => {
      // Arrange
      mockService.applyTemplate.mockResolvedValue("Hello World!");

      // Act
      const result = await server.getServer().callTool("apply_template", {
        id: "123",
        variables: { name: "World" }
      });

      // Assert
      expect(result.content[0].text).toBe("Hello World!");
    });
  });

  describe("search_prompts tool", () => {
    it("should search prompts by query", async () => {
      // Arrange
      const prompts = [{ id: "123", name: "Test" }];
      mockService.searchPrompts.mockResolvedValue(prompts);

      // Act
      const result = await server.getServer().callTool("search_prompts", { query: "test" });

      // Assert
      expect(result.content[0].text).toContain("Test");
      expect(mockService.searchPrompts).toHaveBeenCalledWith("test");
    });
  });

  describe("get_stats tool", () => {
    it("should return statistics", async () => {
      // Arrange
      const stats = { total: 5, templates: 2, regular: 3 };
      mockService.getStats.mockResolvedValue(stats);

      // Act
      const result = await server.getServer().callTool("get_stats", {});

      // Assert
      expect(result.content[0].text).toContain("5");
      expect(mockService.getStats).toHaveBeenCalled();
    });
  });
});
```

## 🏥 Test: Health Check & Error Handling

```typescript
describe("Error Handling", () => {
  describe("NotFoundError", () => {
    it("should be thrown when prompt not found", async () => {
      // Test NotFoundError class and usage
    });
  });

  describe("ValidationError", () => {
    it("should be thrown for invalid template usage", async () => {
      // Test ValidationError class and usage
    });
  });
});

describe("Application Lifecycle", () => {
  it("should handle graceful shutdown", async () => {
    // Test SIGINT/SIGTERM handling
  });

  it("should handle uncaught exceptions", async () => {
    // Test error handling in main()
  });
});
```

---

*Generated automatically by coding agent* 