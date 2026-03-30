package cz.amv.hartmann.controller;

import cz.amv.hartmann.dto.ChangePasswordForm;
import cz.amv.hartmann.dto.RegisterForm;
import cz.amv.hartmann.service.AppUserService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class AuthController {

    private final AppUserService appUserService;

    public AuthController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @GetMapping("/register")
    public String registerForm(Model model) {
        if (!model.containsAttribute("registerForm")) {
            model.addAttribute("registerForm", new RegisterForm());
        }
        return "register";
    }

    @PostMapping("/register")
    public String registerSubmit(@Valid @ModelAttribute RegisterForm registerForm, BindingResult bindingResult, Model model) {
        normalizeForm(registerForm);

        if (!registerForm.getPassword().equals(registerForm.getConfirmPassword())) {
            bindingResult.rejectValue("confirmPassword", "password.mismatch", "Hesla se neshodují.");
        }

        if (bindingResult.hasErrors()) {
            return "register";
        }

        try {
            appUserService.registerNewUser(registerForm);
        } catch (IllegalArgumentException ex) {
            bindingResult.rejectValue("email", "email.exists", ex.getMessage());
            return "register";
        }

        model.addAttribute("successMessage", "Registrace proběhla úspěšně. Teď se můžete přihlásit.");
        model.addAttribute("registerForm", new RegisterForm());
        return "register";
    }

    @GetMapping("/login")
    public String loginForm() {
        return "login";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/dashboard";
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        model.addAttribute("userEmail", userDetails.getUsername());
        return "dashboard";
    }

    @GetMapping("/profile")
    public String profile(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        model.addAttribute("userEmail", userDetails.getUsername());
        if (!model.containsAttribute("changePasswordForm")) {
            model.addAttribute("changePasswordForm", new ChangePasswordForm());
        }
        return "profile";
    }

    @PostMapping("/profile/change-password")
    public String changePassword(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @ModelAttribute ChangePasswordForm changePasswordForm,
        BindingResult bindingResult,
        Model model
    ) {
        model.addAttribute("userEmail", userDetails.getUsername());

        if (!changePasswordForm.getNewPassword().equals(changePasswordForm.getConfirmNewPassword())) {
            bindingResult.rejectValue("confirmNewPassword", "password.mismatch", "Nová hesla se neshodují.");
        }

        if (bindingResult.hasErrors()) {
            return "profile";
        }

        try {
            appUserService.changePassword(
                userDetails.getUsername(),
                changePasswordForm.getCurrentPassword(),
                changePasswordForm.getNewPassword()
            );
        } catch (IllegalArgumentException ex) {
            bindingResult.rejectValue("currentPassword", "password.invalid", ex.getMessage());
            return "profile";
        }

        model.addAttribute("successMessage", "Heslo bylo úspěšně změněno.");
        model.addAttribute("changePasswordForm", new ChangePasswordForm());
        return "profile";
    }

    private void normalizeForm(RegisterForm registerForm) {
        if (registerForm.getEmail() != null) {
            registerForm.setEmail(registerForm.getEmail().trim().toLowerCase());
        }
    }
}
