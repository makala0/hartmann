package cz.amv.hartmann.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping("/")
    public String home() {
        return "forward:/index.html";
    }

    @GetMapping("/login")
    public String login() {
        return "forward:/index.html";
    }

    @GetMapping("/register")
    public String register() {
        return "forward:/index.html";
    }

    @GetMapping("/dashboard/**")
    public String dashboard() {
        return "forward:/index.html";
    }

    @GetMapping("/profile")
    public String profile() {
        return "forward:/index.html";
    }

    @GetMapping("/items")
    public String items() {
        return "forward:/index.html";
    }

    @GetMapping("/inspection")
    public String inspection() {
        return "forward:/index.html";
    }
}
