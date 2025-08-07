# coding: utf-8

Gem::Specification.new do |spec|
  spec.name          = "jekyll-athena-courses"
  spec.version       = "0.0.1"
  spec.authors       = ["aretief"]
  spec.email         = ["attie@attieretief.com"]

  spec.summary       = %q{A simple and elegant theme for Jekyll and GitHub Pages.}
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select do |f|
    f.match(%r{^(assets|_(includes|layouts|sass)/|(LICENSE|README)((\.(txt|md|markdown)|$)))}i)
  end

  spec.add_development_dependency "jekyll"
  spec.add_development_dependency "bundler"
  spec.add_development_dependency "rake"
end
