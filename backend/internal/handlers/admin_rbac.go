package handlers

import (
    "database/sql"
    "net/http"
    "time"

    "github.com/Reactguru24/lumiafrica/internal/middleware"
    "github.com/Reactguru24/lumiafrica/internal/models"
    "github.com/Reactguru24/lumiafrica/internal/utils"
    "github.com/Reactguru24/lumiafrica/internal/config"
    "github.com/Reactguru24/lumiafrica/internal/email"
    "github.com/Reactguru24/lumiafrica/internal/database/sqlc"
    "github.com/Reactguru24/lumiafrica/internal/database/types"
    

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

// CreateRole creates a new RBAC role
func CreateRole() gin.HandlerFunc {
    type req struct {
        Name        string `json:"name" binding:"required"`
        DisplayName string `json:"display_name" binding:"required"`
    }
    return func(c *gin.Context) {
        var r req
        if !bindJSON(c, &r) { return }
        db := getStore(c).DB().SQL
        id := uuid.New()
        _, err := db.ExecContext(c.Request.Context(),
            "INSERT INTO rbac_roles (id, name, display_name, created_at) VALUES (UUID_TO_BIN(?,1), ?, ?, ?)",
            id.String(), r.Name, r.DisplayName, time.Now(),
        )
        if err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to create role")
            return
        }
        utils.Success(c, gin.H{"id": id.String(), "name": r.Name, "display_name": r.DisplayName})
    }
}

// ListRoles lists existing RBAC roles
func ListRoles() gin.HandlerFunc {
    return func(c *gin.Context) {
        db := getStore(c).DB().SQL
        rows, err := db.QueryContext(c.Request.Context(), "SELECT BIN_TO_UUID(id,1) as id, name, display_name, created_at FROM rbac_roles ORDER BY created_at DESC")
        if err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to list roles")
            return
        }
        defer rows.Close()
        var out []map[string]interface{}
        for rows.Next() {
            var id string
            var name, display string
            var created sql.NullTime
            if err := rows.Scan(&id, &name, &display, &created); err != nil { continue }
            out = append(out, map[string]interface{}{"id": id, "name": name, "display_name": display, "created_at": created.Time})
        }
        utils.Success(c, out)
    }
}

// CreatePermission creates a permission
func CreatePermission() gin.HandlerFunc {
    type req struct {
        Name string `json:"name" binding:"required"`
        Description string `json:"description"`
    }
    return func(c *gin.Context) {
        var r req
        if !bindJSON(c, &r) { return }
        db := getStore(c).DB().SQL
        id := uuid.New()
        _, err := db.ExecContext(c.Request.Context(),
            "INSERT INTO rbac_permissions (id, name, description) VALUES (UUID_TO_BIN(?,1), ?, ?)",
            id.String(), r.Name, r.Description,
        )
        if err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to create permission")
            return
        }
        utils.Success(c, gin.H{"id": id.String(), "name": r.Name, "description": r.Description})
    }
}

// ListPermissions returns permissions
func ListPermissions() gin.HandlerFunc {
    return func(c *gin.Context) {
        db := getStore(c).DB().SQL
        rows, err := db.QueryContext(c.Request.Context(), "SELECT BIN_TO_UUID(id,1) as id, name, description FROM rbac_permissions ORDER BY name")
        if err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to list permissions")
            return
        }
        defer rows.Close()
        var out []map[string]interface{}
        for rows.Next() {
            var id, name, desc sql.NullString
            if err := rows.Scan(&id, &name, &desc); err != nil { continue }
            out = append(out, map[string]interface{}{"id": id.String, "name": name.String, "description": desc.String})
        }
        utils.Success(c, out)
    }
}

// AssignPermissionToRole assigns a permission to a role
func AssignPermissionToRole() gin.HandlerFunc {
    type req struct {
        PermissionID string `json:"permission_id" binding:"required"`
    }
    return func(c *gin.Context) {
        roleID := c.Param("roleID")
        var r req
        if !bindJSON(c, &r) { return }
        db := getStore(c).DB().SQL
        _, err := db.ExecContext(c.Request.Context(),
            "INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id, created_at) VALUES (UUID_TO_BIN(?,1), UUID_TO_BIN(?,1), ?)",
            roleID, r.PermissionID, time.Now(),
        )
        if err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to assign permission to role")
            return
        }
        utils.Success(c, gin.H{"role_id": roleID, "permission_id": r.PermissionID})
    }
}

// CheckPermission middleware checks whether current user has a permission
func CheckPermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // if user is platform admin via users.role, allow
        if middleware.GetUserRole(c) == models.RoleAdmin {
            c.Next()
            return
        }
        userID := middleware.GetUserID(c)
        db := getStore(c).DB().SQL
        var exists bool
        row := db.QueryRowContext(c.Request.Context(),
            `SELECT EXISTS(
                SELECT 1
                FROM rbac_user_roles ur
                JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
                JOIN rbac_permissions p ON rp.permission_id = p.id
                WHERE BIN_TO_UUID(ur.user_id,1) = ? AND p.name = ?
            )`,
            userID, permission)
        if err := row.Scan(&exists); err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to check permission")
            c.Abort()
            return
        }
        if !exists {
            utils.Error(c, http.StatusForbidden, "Permission denied")
            c.Abort()
            return
        }
        c.Next()
    }
}

// GetMyPermissions returns permission names assigned to the current user
func GetMyPermissions() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := middleware.GetUserID(c)
        db := getStore(c).DB().SQL
        rows, err := db.QueryContext(c.Request.Context(), `
            SELECT DISTINCT p.name
            FROM rbac_permissions p
            JOIN rbac_role_permissions rp ON p.id = rp.permission_id
            JOIN rbac_user_roles ur ON rp.role_id = ur.role_id
            WHERE BIN_TO_UUID(ur.user_id,1) = ?
        `, userID)
        if err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to fetch permissions")
            return
        }
        defer rows.Close()
        perms := []string{}
        for rows.Next() {
            var name string
            if err := rows.Scan(&name); err != nil { continue }
            perms = append(perms, name)
        }
        utils.Success(c, perms)
    }
}

// InviteUserToRole creates or assigns a user to a role and emails a password reset link
func InviteUserToRole(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        roleID := c.Param("roleID")
        var body struct {
            Email    string `json:"email" binding:"required,email"`
            FullName string `json:"full_name"`
        }
        if !bindJSON(c, &body) { return }

        ctx := c.Request.Context()
        q := getStore(c).Queries()
        mailer := email.NewMailer(cfg)

        emailAddr := body.Email

        // try existing user
        var userID types.BinaryUUID
        row, err := q.GetUserByEmail(ctx, emailAddr)
        if err == nil {
            userID = row.ID
        }

        if userID == (types.BinaryUUID{}) {
            // create a new user with a random password
            pwd := utils.GenerateID()
            hashed, _ := utils.HashPassword(pwd)
            newID := utils.GenerateBinaryID()
            if createErr := q.CreateUser(ctx, sqlc.CreateUserParams{
                ID: newID,
                FullName: body.FullName,
                Email: emailAddr,
                Phone: "",
                Password: hashed,
                Role: sqlc.UsersRoleCUSTOMER,
                Disabled: 0,
            }); createErr != nil {
                utils.Error(c, http.StatusInternalServerError, "Failed to create user")
                return
            }
            userID = newID
        }

        // assign role via rbac_user_roles
        db := getStore(c).DB().SQL
        if _, err := db.ExecContext(ctx, "INSERT IGNORE INTO rbac_user_roles (user_id, role_id, assigned_at) VALUES (UUID_TO_BIN(?,1), UUID_TO_BIN(?,1), ?)", userID.String(), roleID, time.Now()); err != nil {
            utils.Error(c, http.StatusInternalServerError, "Failed to assign role to user")
            return
        }

        // create password reset token and email user a reset link
        token := utils.GenerateID() + utils.GenerateID()
        _ = q.CreatePasswordResetToken(ctx, sqlc.CreatePasswordResetTokenParams{
            ID: utils.GenerateBinaryID(), UserID: userID, Token: token, ExpiresAt: time.Now().Add(24 * time.Hour),
        })
        resetURL := email.BuildResetURL(cfg, token, false)
        _ = mailer.SendPasswordReset(emailAddr, email.PasswordResetEmailData{FullName: body.FullName, ResetURL: resetURL})

        utils.Success(c, gin.H{"role_id": roleID, "email": emailAddr})
    }
}
