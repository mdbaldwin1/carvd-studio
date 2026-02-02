#!/bin/bash

# GitHub Repository Configuration Script
# This script configures repository settings via GitHub CLI
# Run this after you've logged in with: gh auth login

set -e

REPO="mbaldwintech/carvd-studio"

echo "🔧 Configuring GitHub repository: $REPO"
echo ""

# Check if gh CLI is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ Authenticated with GitHub CLI"
echo ""

# Function to update repo settings
configure_general_settings() {
    echo "📝 Configuring general repository settings..."

    # Enable auto-delete of head branches after merge
    gh api repos/$REPO -X PATCH -f delete_branch_on_merge=true

    # Configure merge options
    gh api repos/$REPO -X PATCH \
        -f allow_merge_commit=true \
        -f allow_squash_merge=true \
        -f allow_rebase_merge=false \
        -f allow_auto_merge=true

    echo "✅ General settings configured"
    echo ""
}

# Function to enable security features
configure_security() {
    echo "🔒 Configuring security settings..."

    # Enable vulnerability alerts
    gh api repos/$REPO/vulnerability-alerts -X PUT

    # Enable automated security fixes
    gh api repos/$REPO/automated-security-fixes -X PUT

    echo "✅ Security settings configured"
    echo ""
}

# Function to configure branch protection for main
configure_main_protection() {
    echo "🛡️  Configuring branch protection for 'main'..."

    gh api repos/$REPO/branches/main/protection -X PUT --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": []
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF

    echo "✅ Main branch protection configured"
    echo ""
    echo "⚠️  NOTE: You'll need to add required status checks manually after first workflow run:"
    echo "   - unit-tests (ubuntu-latest, 20)"
    echo "   - unit-tests (macos-latest, 20)"
    echo "   - unit-tests (windows-latest, 20)"
    echo "   - e2e-tests (ubuntu-latest, 20)"
    echo "   - e2e-tests (macos-latest, 20)"
    echo "   - lint"
    echo ""
}

# Function to configure branch protection for develop
configure_develop_protection() {
    echo "🛡️  Configuring branch protection for 'develop'..."

    gh api repos/$REPO/branches/develop/protection -X PUT --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": []
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF

    echo "✅ Develop branch protection configured"
    echo ""
}

# Main execution
main() {
    echo "This script will configure:"
    echo "  1. General repository settings"
    echo "  2. Security features (Dependabot, secret scanning)"
    echo "  3. Branch protection for 'main'"
    echo "  4. Branch protection for 'develop'"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled"
        exit 0
    fi

    configure_general_settings
    configure_security
    configure_main_protection
    configure_develop_protection

    echo "✅ Repository configuration complete!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Go to Settings → Branches and add required status checks"
    echo "  2. Review Settings → Actions → General → Workflow permissions"
    echo "  3. Add required secrets for release workflow"
    echo "  4. Create .github/dependabot.yml for automated dependency updates"
    echo ""
    echo "📖 See .github/GITHUB-SETUP.md for detailed configuration guide"
}

main
