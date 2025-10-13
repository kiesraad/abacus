fn main() {
    #[cfg(any(feature = "memory-serve", feature = "storybook"))]
    {
        let sources = vec![
            #[cfg(feature = "memory-serve")]
            ("frontend", "../frontend/dist"),
            #[cfg(feature = "storybook")]
            ("storybook", "../frontend/dist-storybook"),
        ];
        memory_serve::load_names_directories(sources, true);
    }
}
