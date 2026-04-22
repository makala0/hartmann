package cz.amv.hartmann.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class FrontendController {

    // Zachytí všechny požadavky, které nejsou API calls
    @RequestMapping(value = {"/", "/login", "/register", "/dashboard/**"})
    public String forward() {
        // Vrátí index.html ze static složky
        return "forward:/index.html";
    }
}